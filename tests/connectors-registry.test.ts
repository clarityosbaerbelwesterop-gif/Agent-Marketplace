import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONNECTOR_IDS } from "../lib/connectors/types";
import { CONNECTOR_LIST, CONNECTOR_REGISTRY, isConnectorId, oauthEnvConfigured } from "../lib/connectors/registry";
import { canonicalConnectorId } from "../lib/connectors/aliases";
import { connectorReadAction, connectorToolsForGrants } from "../lib/connectors/tools";

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


  it("exposes real read-only actions for first-wave connector invokes", () => {
    const now = new Date().toISOString();
    const grants = [
      "neon",
      "github",
      "slack",
      "vercel",
      "supabase",
      "render",
      "stripe",
      "cursor",
    ].map((provider, index) => ({
      id: `grant-${index}`,
      provider,
      scopes: [],
      status: "active" as const,
      hasCredentials: true,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    }));
    const tools = connectorToolsForGrants(grants);
    const invokeTools = tools.filter((tool) => tool.function.name.endsWith("_invoke"));
    assert.equal(invokeTools.length, 8);
    assert.equal(connectorReadAction("github"), "list_repositories");
    assert.equal(connectorReadAction("slack"), "list_channels");
    assert.equal(connectorReadAction("vercel"), "list_projects");
    assert.equal(connectorReadAction("neon"), "list_projects");
    assert.equal(connectorReadAction("render"), "list_services");
    assert.equal(connectorReadAction("stripe"), "read_balance");
    assert.equal(connectorReadAction("supabase"), "inspect_api");
    assert.equal(connectorReadAction("cursor"), "connection_only");
    for (const tool of invokeTools) {
      assert.match(tool.function.description, /read action/i);
      assert.doesNotMatch(tool.function.description, /live writes are not implemented/i);
    }
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
