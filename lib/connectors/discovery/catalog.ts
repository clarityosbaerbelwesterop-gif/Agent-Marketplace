import type { DiscoveryCandidate, DiscoverySearchResult } from "./types";

/**
 * Discovery is catalog-only. Runtime grants stay limited to the first-wave
 * registry — never mark a discovered row grantable.
 */
export function catalogOnlyCandidate(
  input: Omit<DiscoveryCandidate, "grantable" | "untrusted">,
): DiscoveryCandidate {
  return {
    name: input.name,
    repoUrl: input.repoUrl,
    description: input.description,
    source: input.source,
    sourceRef: input.sourceRef,
    grantable: false,
    untrusted: true,
  };
}

export function stampDiscoveryItems(
  items: Array<
    Omit<DiscoveryCandidate, "grantable" | "untrusted"> & {
      grantable?: boolean;
      untrusted?: boolean;
    }
  >,
): DiscoveryCandidate[] {
  return items.map((item) =>
    catalogOnlyCandidate({
      name: item.name,
      repoUrl: item.repoUrl,
      description: item.description,
      source: item.source,
      sourceRef: item.sourceRef,
    }),
  );
}

export function discoveryItemsAreCatalogOnly(
  items: ReadonlyArray<{ grantable?: boolean }>,
): boolean {
  return items.every((item) => item.grantable === false);
}

export function withDiscoveryInvariant(
  result: DiscoverySearchResult,
): DiscoverySearchResult {
  return {
    ...result,
    catalogOnly: true,
    items: stampDiscoveryItems(result.items),
  };
}
