import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONNECTOR_IDS } from "../lib/connectors/types";
import {
  UPCOMING_CONNECTOR_IDS,
  UPCOMING_CONNECTOR_LIST,
} from "../lib/connectors/upcoming";

describe("upcoming connector shells", () => {
  it("keeps Higgsfield, LinkedIn, Meta, and Google Search as first-party stubs, not pending shells", () => {
    assert.deepEqual(CONNECTOR_IDS, [
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
    ]);
    assert.deepEqual(UPCOMING_CONNECTOR_IDS, []);
    assert.equal(UPCOMING_CONNECTOR_LIST.length, 0);
  });
});
