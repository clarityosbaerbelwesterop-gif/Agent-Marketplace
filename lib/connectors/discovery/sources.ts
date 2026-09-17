/**
 * Documented public sources for MCP server *catalog* discovery.
 *
 * Discovery never installs, grants, or executes remote code. Runtime grants
 * stay limited to the first-wave registry in `lib/connectors/registry.ts`.
 */
export const DISCOVERY_FETCH_TIMEOUT_MS = 4_000;

export const MCP_REGISTRY_SOURCE = {
  id: "mcp_registry" as const,
  name: "Official MCP Registry",
  listUrl: "https://registry.modelcontextprotocol.io/v0.1/servers",
  docs: "https://modelcontextprotocol.io/registry/registry-aggregators",
  apiDocs:
    "https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/official-registry-api.md",
  notes:
    "Unauthenticated GET /v0.1/servers with cursor pagination, search, and version=latest. Catalog metadata only.",
};

export const GITHUB_TOPIC_SOURCE = {
  id: "github_topic" as const,
  name: "GitHub repository topics",
  searchUrl: "https://api.github.com/search/repositories",
  docs: "https://docs.github.com/en/rest/search/search#search-repositories",
  topics: ["mcp-server", "model-context-protocol"] as const,
  notes:
    "Public GitHub Search API. Queries curated topics; optional GITHUB_DISCOVERY_TOKEN raises rate limits. Not an installer.",
};

export const DISCOVERY_SOURCES = [MCP_REGISTRY_SOURCE, GITHUB_TOPIC_SOURCE] as const;

export type DiscoverySourceId = (typeof DISCOVERY_SOURCES)[number]["id"];
