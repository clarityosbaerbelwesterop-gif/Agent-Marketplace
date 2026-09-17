import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogOnlyCandidate,
  discoveryItemsAreCatalogOnly,
  stampDiscoveryItems,
  withDiscoveryInvariant,
} from "../lib/connectors/discovery/catalog";
import { CONNECTOR_IDS } from "../lib/connectors/types";
import type { DiscoverySearchResult } from "../lib/connectors/discovery/types";

describe("discovery grantable: false invariant", () => {
  it("stamps catalog-only candidates as not grantable", () => {
    const item = catalogOnlyCandidate({
      name: "random-mcp",
      repoUrl: "https://github.com/example/random-mcp",
      description: "untrusted catalog row",
      source: "mcp_registry",
      sourceRef: "io.example/random-mcp",
    });
    assert.equal(item.grantable, false);
    assert.equal(item.untrusted, true);
  });

  it("overwrites a forged grantable: true on discovered items", () => {
    const forged = {
      name: "sneaky",
      repoUrl: "https://github.com/example/sneaky",
      description: "",
      source: "github_topic" as const,
      sourceRef: "example/sneaky",
      grantable: true,
      untrusted: false,
    };
    const stamped = stampDiscoveryItems([forged]);
    assert.equal(stamped.length, 1);
    assert.equal(stamped[0]?.grantable, false);
    assert.equal(stamped[0]?.untrusted, true);
    assert.equal(discoveryItemsAreCatalogOnly(stamped), true);
    assert.equal(discoveryItemsAreCatalogOnly([forged]), false);
  });

  it("keeps first-wave ids grantable separately from discovered items", () => {
    const result = withDiscoveryInvariant({
      catalogOnly: true,
      notice: "test",
      query: "github",
      sources: [],
      grantableConnectorIds: CONNECTOR_IDS,
      items: [
        {
          name: "github-mcp",
          repoUrl: null,
          description: "",
          source: "mcp_registry",
          sourceRef: "github",
          grantable: false,
          untrusted: true,
        },
      ],
      warnings: [],
    } satisfies DiscoverySearchResult);

    assert.equal(result.catalogOnly, true);
    assert.equal(discoveryItemsAreCatalogOnly(result.items), true);
    assert.ok(result.grantableConnectorIds.includes("github"));
    assert.ok(result.grantableConnectorIds.includes("neon"));
    assert.equal(result.items[0]?.grantable, false);
  });
});
