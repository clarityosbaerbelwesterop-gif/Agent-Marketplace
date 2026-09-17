export { DISCOVERY_SOURCES, MCP_REGISTRY_SOURCE, GITHUB_TOPIC_SOURCE } from "./sources";
export { searchDiscoveredConnectors, sanitizeDiscoveryQuery } from "./search";
export {
  catalogOnlyCandidate,
  discoveryItemsAreCatalogOnly,
  stampDiscoveryItems,
  withDiscoveryInvariant,
} from "./catalog";
export type {
  DiscoveryCandidate,
  DiscoverySearchResult,
  DiscoveryWarning,
} from "./types";
