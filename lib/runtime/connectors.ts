import { and, eq } from "drizzle-orm";
import { withUserRls } from "@/lib/db";
import { connectorGrants } from "@/lib/db/schema";
import type { AgentConnectorSpec } from "@/lib/db/json";

/**
 * Connector grants during a rental.
 *
 * Real OAuth is not wired. Requesting a grant inserts/updates a `pending`
 * row. `stub_grant` marks it granted for runtime testing only — it is not
 * a payment or OAuth success.
 */
export async function listConnectorGrants(userId: string, workspaceId: string) {
  return withUserRls(userId, async (db) => {
    return db
      .select()
      .from(connectorGrants)
      .where(
        and(
          eq(connectorGrants.workspaceId, workspaceId),
          eq(connectorGrants.userId, userId),
        ),
      );
  });
}

export function mergeConnectorStatus(
  specs: AgentConnectorSpec[],
  grants: Array<{
    id: string;
    provider: string;
    scopes: string[];
    status: string;
  }>,
) {
  return specs.map((spec) => {
    const grant = grants.find((row) => row.provider === spec.provider);
    return {
      provider: spec.provider,
      required: Boolean(spec.required),
      requestedScopes: spec.scopes ?? [],
      grant: grant
        ? {
            id: grant.id,
            status: grant.status,
            scopes: grant.scopes,
          }
        : null,
    };
  });
}

export async function requestConnectorGrant(input: {
  userId: string;
  workspaceId: string;
  provider: string;
  scopes?: string[];
  stubGrant?: boolean;
}) {
  const provider = input.provider.trim().toLowerCase();
  if (!provider) {
    return { ok: false as const, error: "provider is required", status: 400 };
  }
  const scopes = input.scopes ?? [];
  const status = input.stubGrant ? "granted" : "pending";

  const [row] = await withUserRls(input.userId, async (db) => {
    return db
      .insert(connectorGrants)
      .values({
        workspaceId: input.workspaceId,
        userId: input.userId,
        provider,
        scopes,
        status,
      })
      .onConflictDoUpdate({
        target: [
          connectorGrants.workspaceId,
          connectorGrants.userId,
          connectorGrants.provider,
        ],
        set: {
          scopes,
          status,
        },
      })
      .returning();
  });

  return {
    ok: true as const,
    data: {
      ...row,
      oauth: input.stubGrant
        ? "stub_grant"
        : "not_wired",
      detail: input.stubGrant
        ? "Marked granted without OAuth. This is a stub for runtime testing."
        : "OAuth is not wired. The grant stays pending until a later provider flow.",
    },
  };
}
