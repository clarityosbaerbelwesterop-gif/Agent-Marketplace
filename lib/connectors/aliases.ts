import { isConnectorId } from "./registry";
import type { ConnectorId } from "./types";

/**
 * Catalog seed still uses a few legacy provider ids. Map them onto the
 * first-party set without re-seeding 10k rows.
 */
const CATALOG_PROVIDER_ALIASES: Record<string, ConnectorId> = {
  postgres: "neon",
  figma: "vercel",
  browser: "github",
  web: "vercel",
  docs: "github",
  analytics: "stripe",
  crm: "stripe",
  issues: "github",
};

export function canonicalConnectorId(provider: string): ConnectorId | null {
  const key = provider.trim().toLowerCase();
  const aliased = CATALOG_PROVIDER_ALIASES[key] ?? key;
  return isConnectorId(aliased) ? aliased : null;
}
