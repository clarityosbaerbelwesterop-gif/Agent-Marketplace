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
  crm: "linkedin",
  issues: "github",
  ads: "meta",
  meta_ads: "meta",
  search: "google-search",
  google_search: "google-search",
  higgs: "higgsfield",
  linkedin: "linkedin",
};

export function canonicalConnectorId(provider: string): ConnectorId | null {
  const key = provider.trim().toLowerCase().replace(/_/g, "-");
  const aliased = CATALOG_PROVIDER_ALIASES[key] ?? CATALOG_PROVIDER_ALIASES[provider.trim().toLowerCase()] ?? key;
  return isConnectorId(aliased) ? aliased : null;
}
