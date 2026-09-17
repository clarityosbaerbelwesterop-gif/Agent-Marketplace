import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { buildModelRoute, isHighVolumeUsage } from "../lib/llm/route";

const KEYS = [
  "UNOROUTER_API_KEY",
  "FREELLM_API_KEY",
  "UNOROUTER_MODEL_FRONTIER",
  "FREELLM_MODEL_FRONTIER",
];

afterEach(() => {
  for (const key of KEYS) {
    delete process.env[key];
  }
});

describe("buildModelRoute", () => {
  it("prefers UNOROUTER for frontier and records FreeLLM as paid failover", () => {
    process.env.UNOROUTER_API_KEY = "ur-test";
    process.env.FREELLM_API_KEY = "fl-test";
    const route = buildModelRoute({ alias: "frontier" });
    assert.equal(route.preferUnorouter, true);
    assert.equal(route.candidates[0]?.provider, "unorouter");
    const freellm = route.candidates.filter((row) => row.provider === "freellm");
    assert.ok(freellm.length > 0);
    assert.ok(freellm.every((row) => row.downgradedFromPaid));
    assert.ok(freellm.every((row) => row.role === "failover" || row.role === "high_volume"));
  });

  it("inserts FreeLLM earlier for high-volume continuation without dropping UNOROUTER primary", () => {
    process.env.UNOROUTER_API_KEY = "ur-test";
    process.env.FREELLM_API_KEY = "fl-test";
    const route = buildModelRoute({
      alias: "elite",
      usageConsumed: 200_000,
      usageIncluded: 320_000,
    });
    assert.equal(route.highVolume, true);
    assert.equal(route.candidates[0]?.provider, "unorouter");
    assert.equal(route.candidates[1]?.provider, "freellm");
    assert.equal(route.candidates[1]?.downgradedFromPaid, true);
  });

  it("uses FreeLLM as primary when UNOROUTER is missing", () => {
    process.env.FREELLM_API_KEY = "fl-test";
    const route = buildModelRoute({ alias: "standard" });
    assert.equal(route.candidates[0]?.provider, "freellm");
    assert.equal(route.candidates[0]?.downgradedFromPaid, false);
    assert.equal(route.candidates.every((row) => row.provider === "freellm"), true);
  });

  it("returns no candidates when neither key is set", () => {
    const route = buildModelRoute({ alias: "standard" });
    assert.deepEqual(route.candidates, []);
  });
});

describe("isHighVolumeUsage", () => {
  it("trips on token floor or included-window ratio", () => {
    assert.equal(isHighVolumeUsage({ usageConsumed: 80_000, usageIncluded: 1_000_000 }), true);
    assert.equal(isHighVolumeUsage({ usageConsumed: 50, usageIncluded: 100 }), true);
    assert.equal(isHighVolumeUsage({ usageConsumed: 10, usageIncluded: 100 }), false);
  });
});
