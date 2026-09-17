import type { DiscoverySourceId } from "./sources";

export type DiscoveryCandidate = {
  name: string;
  repoUrl: string | null;
  description: string;
  source: DiscoverySourceId;
  sourceRef: string;
  /** Always false: discovery is catalog-only. */
  grantable: false;
  untrusted: true;
};

export type DiscoveryWarning = {
  source: DiscoverySourceId;
  error: string;
};

export type DiscoverySearchResult = {
  catalogOnly: true;
  notice: string;
  query: string;
  sources: Array<{
    id: DiscoverySourceId;
    name: string;
    docs: string;
    notes: string;
  }>;
  grantableConnectorIds: readonly string[];
  items: DiscoveryCandidate[];
  warnings: DiscoveryWarning[];
};
