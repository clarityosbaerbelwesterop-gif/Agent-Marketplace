import { CONNECTOR_IDS } from "../types";
import { fetchGithubTopicRepos } from "./github-topics";
import { fetchOfficialRegistry } from "./official-registry";
import { DISCOVERY_SOURCES } from "./sources";
import type {
  DiscoveryCandidate,
  DiscoverySearchResult,
  DiscoveryWarning,
} from "./types";

const NOTICE =
  "Discovery is catalog-only. Do not auto-install or trust arbitrary MCP server code. Only the first-wave eight connectors can be granted at runtime.";

const MAX_QUERY_LENGTH = 80;
const MAX_ITEMS = 40;
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  result: DiscoverySearchResult;
};

const cache = new Map<string, CacheEntry>();

export function sanitizeDiscoveryQuery(raw: string | null | undefined): string {
  return (raw ?? "")
    .replace(/[\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

function matchesQuery(item: DiscoveryCandidate, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = `${item.name} ${item.description} ${item.repoUrl ?? ""} ${item.sourceRef}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function dedupe(items: DiscoveryCandidate[]): DiscoveryCandidate[] {
  const seen = new Set<string>();
  const next: DiscoveryCandidate[] = [];
  for (const item of items) {
    const key = (item.repoUrl || item.sourceRef || item.name).toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(item);
  }
  return next;
}

export async function searchDiscoveredConnectors(
  rawQuery: string | null | undefined,
): Promise<DiscoverySearchResult> {
  const query = sanitizeDiscoveryQuery(rawQuery);
  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const [registry, github] = await Promise.all([
    fetchOfficialRegistry(query),
    fetchGithubTopicRepos(query),
  ]);

  const warnings: DiscoveryWarning[] = [];
  if (registry.warning) {
    warnings.push(registry.warning);
  }
  if (github.warning) {
    warnings.push(github.warning);
  }

  const items = dedupe(
    [...registry.items, ...github.items].filter((item) =>
      matchesQuery(item, query),
    ),
  ).slice(0, MAX_ITEMS);

  const result: DiscoverySearchResult = {
    catalogOnly: true,
    notice: NOTICE,
    query,
    sources: DISCOVERY_SOURCES.map((source) => ({
      id: source.id,
      name: source.name,
      docs: source.docs,
      notes: source.notes,
    })),
    grantableConnectorIds: CONNECTOR_IDS,
    items,
    warnings,
  };

  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, result });
  return result;
}
