import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONNECTOR_IDS } from "../lib/connectors/types";
import { CONNECTOR_LIST, CONNECTOR_REGISTRY, isConnectorId, oauthEnvConfigured } from "../lib/connectors/registry";
import { canonicalConnectorId } from "../lib/connectors/aliases";

describe("expanded first-party connector registry", () => {
  it("includes first-wave plus higgsfield, linkedin, meta, google-search", () => {
    for (const id of [
      "neon",
      "github",
      "slack",
      "vercel",
      "supabase",
      "render",
      "stripe",
      "cursor",
      "higgsfield",
      "linkedin",
      "meta",
      "google-search",
    ]) {
      assert.equal(isConnectorId(id), true, id);
      assert.ok(CONNECTOR_REGISTRY[id as keyof typeof CONNECTOR_REGISTRY]);
    }
    assert.equal(CONNECTOR_LIST.length, CONNECTOR_IDS.length);
    assert.equal(CONNECTOR_IDS.length, 12);
    assert.equal(canonicalConnectorId("meta_ads"), "meta");
    assert.equal(canonicalConnectorId("google_search"), "google-search");
  });

  it("does not mark OAuth ready without platform secrets", () => {
    delete process.env.LINKEDIN_CLIENT_ID;
    delete process.env.LINKEDIN_CLIENT_SECRET;
    assert.equal(oauthEnvConfigured(CONNECTOR_REGISTRY.linkedin), false);
    assert.equal(CONNECTOR_REGISTRY.higgsfield.oauth, null);
    assert.equal(CONNECTOR_REGISTRY["google-search"].oauth, null);
    assert.equal(CONNECTOR_REGISTRY.meta.oauth, null);
  });
});
