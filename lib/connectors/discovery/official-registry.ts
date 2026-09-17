import { fetchJsonWithTimeout } from "./http";
import { MCP_REGISTRY_SOURCE } from "./sources";
import type { DiscoveryCandidate, DiscoveryWarning } from "./types";

type RegistryServer = {
  name?: unknown;
  title?: unknown;
  description?: unknown;
  repository?: { url?: unknown; source?: unknown } | null;
  websiteUrl?: unknown;
};

type RegistryList = {
  servers?: Array<{ server?: RegistryServer } | RegistryServer>;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unwrapServer(entry: { server?: RegistryServer } | RegistryServer): RegistryServer {
  if (entry && typeof entry === "object" && "server" in entry && entry.server) {
    return entry.server;
  }
  return entry as RegistryServer;
}

export async function fetchOfficialRegistry(
  query: string,
): Promise<{ items: DiscoveryCandidate[]; warning: DiscoveryWarning | null }> {
  const url = new URL(MCP_REGISTRY_SOURCE.listUrl);
  url.searchParams.set("limit", "30");
  url.searchParams.set("version", "latest");
  if (query) {
    url.searchParams.set("search", query);
  }

  const result = await fetchJsonWithTimeout(url.toString());
  if (!result.ok) {
    return {
      items: [],
      warning: { source: MCP_REGISTRY_SOURCE.id, error: result.error },
    };
  }

  const payload = result.data as RegistryList | null;
  const rows = Array.isArray(payload?.servers) ? payload.servers : [];
  const items: DiscoveryCandidate[] = [];

  for (const row of rows) {
    const server = unwrapServer(row);
    const name =
      asString(server.title) || asString(server.name) || "unnamed-mcp-server";
    const repoUrl =
      asString(server.repository?.url) || asString(server.websiteUrl);
    const description = asString(server.description) ?? "";
    items.push({
      name,
      repoUrl,
      description,
      source: MCP_REGISTRY_SOURCE.id,
      sourceRef: asString(server.name) || name,
      grantable: false,
      untrusted: true,
    });
  }

  return { items, warning: null };
}
