import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb, withUserRls } from "@/lib/db";
import { connectorGrants, rentals } from "@/lib/db/schema";
import type { ConnectorCredentials, JsonObject } from "@/lib/db/json";
import { CONNECTOR_REGISTRY, getConnector, oauthEnvConfigured } from "./registry";
import { canonicalConnectorId } from "./aliases";
import {
  buildAuthorizeUrl,
  encodeOauthState,
  oauthStateSecretConfigured,
} from "./oauth";
import { toPublicGrant } from "./public-grant";
import { hasStoredCredentials } from "./status";
import { CONNECTOR_IDS, type ConnectorId, type PublicConnectorGrant } from "./types";

function connectorDefinitionFromInput(provider: string) {
  const raw = provider.trim().toLowerCase();
  return getConnector(canonicalConnectorId(raw) ?? raw);
}

export type GrantRow = typeof connectorGrants.$inferSelect;

function asJsonObject(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

/** Pending stub inserted on rental activation. Never granted. Never has tokens. */
export function pendingGrantStubRow(input: {
  userId: string;
  workspaceId: string;
  provider: ConnectorId;
}) {
  const definition = CONNECTOR_REGISTRY[input.provider];
  return {
    workspaceId: input.workspaceId,
    userId: input.userId,
    provider: input.provider,
    scopes: [...definition.requiredScopes],
    status: "pending" as const,
    credentials: null,
    metadata: {
      source: "rental_activation",
      authMethod: definition.oauth ? "oauth" : "api_key",
    },
  };
}

export function pendingGrantStubsForWorkspace(input: {
  userId: string;
  workspaceId: string;
  providers?: readonly ConnectorId[];
}) {
  const providers = input.providers ?? CONNECTOR_IDS;
  return providers.map((provider) =>
    pendingGrantStubRow({
      userId: input.userId,
      workspaceId: input.workspaceId,
      provider,
    }),
  );
}

export async function listConnectorGrants(userId: string, workspaceId: string) {
  return withUserRls(userId, async (db) => {
    const rows = await db
      .select({
        id: connectorGrants.id,
        provider: connectorGrants.provider,
        scopes: connectorGrants.scopes,
        status: connectorGrants.status,
        metadata: connectorGrants.metadata,
        createdAt: connectorGrants.createdAt,
        updatedAt: connectorGrants.updatedAt,
        hasCredentials: sql<boolean>`${connectorGrants.credentials} is not null`.as(
          "has_credentials",
        ),
      })
      .from(connectorGrants)
      .where(
        and(
          eq(connectorGrants.workspaceId, workspaceId),
          eq(connectorGrants.userId, userId),
        ),
      );
    return rows.map((row) => toPublicGrant(row));
  });
}

export async function getConnectorGrantWithSecrets(input: {
  userId: string;
  workspaceId: string;
  provider: ConnectorId;
}): Promise<GrantRow | null> {
  const [row] = await withUserRls(input.userId, async (db) => {
    return db
      .select()
      .from(connectorGrants)
      .where(
        and(
          eq(connectorGrants.workspaceId, input.workspaceId),
          eq(connectorGrants.userId, input.userId),
          eq(connectorGrants.provider, input.provider),
        ),
      )
      .limit(1);
  });
  return row ?? null;
}

function parseCredentialInput(
  raw: unknown,
  tenantSecretNames: string[],
): ConnectorCredentials | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const apiKeys: Record<string, string> = {};
  for (const name of tenantSecretNames) {
    const value = record[name];
    if (typeof value === "string" && value.trim()) {
      apiKeys[name] = value.trim();
    }
  }
  const accessToken =
    typeof record.accessToken === "string" ? record.accessToken.trim() : "";
  if (Object.keys(apiKeys).length === 0 && !accessToken) {
    return null;
  }
  const credentials: ConnectorCredentials = {};
  if (Object.keys(apiKeys).length > 0) {
    credentials.apiKeys = apiKeys;
  }
  if (accessToken) {
    credentials.accessToken = accessToken;
  }
  return credentials;
}

function credentialsComplete(
  credentials: ConnectorCredentials | null,
  tenantSecretNames: string[],
): boolean {
  if (!credentials) {
    return false;
  }
  if (credentials.accessToken && credentials.accessToken.trim()) {
    return true;
  }
  if (tenantSecretNames.length === 0) {
    return hasStoredCredentials(credentials);
  }
  const keys = credentials.apiKeys ?? {};
  return tenantSecretNames.every((name) => Boolean(keys[name]?.trim()));
}

export async function upsertConnectorGrant(input: {
  userId: string;
  workspaceId: string;
  provider: ConnectorId;
  scopes: string[];
  status: "pending" | "granted" | "revoked";
  metadata?: JsonObject;
  credentials?: ConnectorCredentials | null;
  clearCredentials?: boolean;
}): Promise<GrantRow> {
  const metadata = input.metadata ?? {};
  const [row] = await withUserRls(input.userId, async (db) => {
    return db
      .insert(connectorGrants)
      .values({
        workspaceId: input.workspaceId,
        userId: input.userId,
        provider: input.provider,
        scopes: input.scopes,
        status: input.status,
        metadata,
        credentials: input.clearCredentials ? null : input.credentials ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          connectorGrants.workspaceId,
          connectorGrants.userId,
          connectorGrants.provider,
        ],
        set: {
          scopes: input.scopes,
          status: input.status,
          metadata,
          ...(input.clearCredentials
            ? { credentials: null }
            : input.credentials
              ? { credentials: input.credentials }
              : {}),
          updatedAt: new Date(),
        },
      })
      .returning();
  });
  return row;
}

export async function requestConnectorGrant(input: {
  userId: string;
  workspaceId: string;
  provider: string;
  scopes?: string[];
  credentials?: unknown;
  request?: Request;
  rentalId?: string | null;
}): Promise<
  | {
      ok: true;
      data: {
        grant: PublicConnectorGrant;
        authorizeUrl: string | null;
        oauth: "ready" | "not_configured" | "not_applicable";
        detail: string;
      };
    }
  | { ok: false; error: string; status: number }
> {
  const definition = connectorDefinitionFromInput(input.provider);
  if (!definition) {
    return { ok: false, error: "Unknown connector", status: 400 };
  }

  const scopes =
    input.scopes && input.scopes.length > 0
      ? input.scopes
      : definition.requiredScopes;
  const credentials = parseCredentialInput(
    input.credentials,
    definition.tenantSecretNames,
  );

  const existing = await getConnectorGrantWithSecrets({
    userId: input.userId,
    workspaceId: input.workspaceId,
    provider: definition.id,
  });

  if (credentials && credentialsComplete(credentials, definition.tenantSecretNames)) {
    const row = await upsertConnectorGrant({
      userId: input.userId,
      workspaceId: input.workspaceId,
      provider: definition.id,
      scopes,
      status: "granted",
      credentials,
      metadata: {
        authMethod: "api_key",
        connectedAt: new Date().toISOString(),
      },
    });
    return {
      ok: true,
      data: {
        grant: toPublicGrant(row),
        authorizeUrl: null,
        oauth: definition.oauth ? "not_configured" : "not_applicable",
        detail: "Grant is active. Tenant credentials were stored for this workspace.",
      },
    };
  }

  if (
    definition.oauth &&
    oauthEnvConfigured(definition) &&
    oauthStateSecretConfigured() &&
    input.request
  ) {
    const state = encodeOauthState({
      u: input.userId,
      w: input.workspaceId,
      p: definition.id,
      r: input.rentalId ?? null,
      n: randomBytes(8).toString("hex"),
      e: Date.now() + 10 * 60 * 1000,
    });
    const authorizeUrl = state
      ? buildAuthorizeUrl({
          request: input.request,
          definition,
          state,
        })
      : null;
    if (authorizeUrl) {
      const row = await upsertConnectorGrant({
        userId: input.userId,
        workspaceId: input.workspaceId,
        provider: definition.id,
        scopes,
        status: "pending",
        metadata: { authMethod: "oauth", startedAt: new Date().toISOString() },
      });
      return {
        ok: true,
        data: {
          grant: toPublicGrant(row),
          authorizeUrl,
          oauth: "ready",
          detail: `Redirect the user to authorizeUrl, then ${definition.oauth.callbackPath}. The grant stays pending until the callback succeeds.`,
        },
      };
    }
  }

  if (existing?.status === "granted") {
    return {
      ok: true,
      data: {
        grant: toPublicGrant(existing),
        authorizeUrl: null,
        oauth: definition.oauth
          ? oauthEnvConfigured(definition)
            ? "ready"
            : "not_configured"
          : "not_applicable",
        detail: "Grant is already active for this workspace.",
      },
    };
  }

  const row = await upsertConnectorGrant({
    userId: input.userId,
    workspaceId: input.workspaceId,
    provider: definition.id,
    scopes,
    status: "pending",
    metadata: {
      authMethod: definition.oauth ? "oauth" : "api_key",
      startedAt: new Date().toISOString(),
    },
  });

  const missingOauth = Boolean(definition.oauth && !oauthEnvConfigured(definition));
  const missingState = Boolean(definition.oauth && !oauthStateSecretConfigured());
  const missingSecrets = definition.tenantSecretNames.join(", ");
  const detail = definition.oauth
    ? missingOauth
      ? `OAuth env ${definition.envSecretNames.join(", ")} is not set. Callback: ${definition.oauth.callbackPath}. Provide ${missingSecrets || "a tenant token"} to connect without OAuth. The grant stays pending.`
      : missingState
        ? "OAuth client is set but CONNECTOR_OAUTH_STATE_SECRET or NEON_AUTH_COOKIE_SECRET (≥ 32 chars) is required to sign state. The grant stays pending."
        : `OAuth did not start. Callback: ${definition.oauth.callbackPath}. The grant stays pending.`
    : `Provide ${missingSecrets} to activate this connector. The grant stays pending until credentials are stored.`;

  return {
    ok: true,
    data: {
      grant: toPublicGrant(row),
      authorizeUrl: null,
      oauth: definition.oauth
        ? missingOauth || missingState
          ? "not_configured"
          : "not_configured"
        : "not_applicable",
      detail,
    },
  };
}

export async function activateOauthGrant(input: {
  userId: string;
  workspaceId: string;
  provider: ConnectorId;
  scopes: string[];
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  accountLabel?: string;
}): Promise<PublicConnectorGrant> {
  const row = await upsertConnectorGrant({
    userId: input.userId,
    workspaceId: input.workspaceId,
    provider: input.provider,
    scopes: input.scopes,
    status: "granted",
    credentials: {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      tokenType: input.tokenType,
    },
    metadata: {
      authMethod: "oauth",
      connectedAt: new Date().toISOString(),
      ...(input.accountLabel ? { accountLabel: input.accountLabel } : {}),
    },
  });
  return toPublicGrant(row);
}

export async function revokeConnectorGrant(input: {
  userId: string;
  workspaceId: string;
  provider: string;
}): Promise<
  | { ok: true; data: PublicConnectorGrant }
  | { ok: false; error: string; status: number }
> {
  const definition = connectorDefinitionFromInput(input.provider);
  if (!definition) {
    return { ok: false, error: "Unknown connector", status: 400 };
  }
  const existing = await getConnectorGrantWithSecrets({
    userId: input.userId,
    workspaceId: input.workspaceId,
    provider: definition.id,
  });
  if (!existing) {
    return { ok: false, error: "Grant not found", status: 404 };
  }
  const row = await upsertConnectorGrant({
    userId: input.userId,
    workspaceId: input.workspaceId,
    provider: definition.id,
    scopes: existing.scopes,
    status: "revoked",
    clearCredentials: true,
    metadata: {
      ...asJsonObject(existing.metadata),
      revokedAt: new Date().toISOString(),
    },
  });
  return { ok: true, data: toPublicGrant(row) };
}

/**
 * After Stripe webhook activation *or* unpaid_test create, insert pending
 * grant stubs for every first-party registry id. Privileged insert so this
 * does not depend on a user JWT. Existing rows (including granted credentials)
 * are left alone. Never marks grants granted or invents tokens.
 */
export async function ensurePendingConnectorGrantsForRental(rentalId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      userId: rentals.userId,
      workspaceId: rentals.workspaceId,
      status: rentals.status,
    })
    .from(rentals)
    .where(eq(rentals.id, rentalId))
    .limit(1);

  if (!row || row.status !== "active") {
    return;
  }

  const now = new Date();
  const values = pendingGrantStubsForWorkspace({
    userId: row.userId,
    workspaceId: row.workspaceId,
  }).map((stub) => ({
    ...stub,
    updatedAt: now,
  }));

  await db
    .insert(connectorGrants)
    .values(values)
    .onConflictDoNothing({
      target: [
        connectorGrants.workspaceId,
        connectorGrants.userId,
        connectorGrants.provider,
      ],
    });
}
