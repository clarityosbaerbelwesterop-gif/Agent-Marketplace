import { sanitizePublicMetadata } from "./secrets";
import { asSqlBoolean, hasStoredCredentials, toApiStatus } from "./status";
import type { PublicConnectorGrant } from "./types";

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Public grant JSON. Never copies credentials, tokens, apiKeys, or secret metadata.
 * `hasCredentials` is a boolean only — callers must not round-trip the blob.
 *
 * Kept free of the Postgres client so Client Components can serialize catalog UI.
 */
export function toPublicGrant(row: {
  id: string;
  provider: string;
  scopes: string[];
  status: string;
  metadata: unknown;
  credentials?: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
  hasCredentials?: boolean;
}): PublicConnectorGrant {
  return {
    id: row.id,
    provider: row.provider,
    scopes: [...row.scopes],
    status: toApiStatus(row.status),
    hasCredentials: asSqlBoolean(row.hasCredentials)
      ? true
      : hasStoredCredentials(row.credentials ?? null),
    metadata: sanitizePublicMetadata(row.metadata),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}
