import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  filterSameTierOrBetter,
  modelsForFreellmAlias,
  resolveFreellmAlias,
} from "../lib/freellm/aliases";
import { isFreellmError } from "../lib/freellm/errors";
import {
  capacityOrder,
  isCapacityFailoverError,
  isLengthFinish,
} from "../lib/runtime/capacity";
import { UnorouterError } from "../lib/unorouter/errors";
import { FreellmError } from "../lib/freellm/errors";
import { MODEL_ALIASES } from "../lib/unorouter/types";

const ENV_KEYS = [
  "FREELLM_API_KEY",
  "UNOROUTER_API_KEY",
  "FREELLM_PREFERRED",
  "MODEL_CAPACITY",
  ...MODEL_ALIASES.flatMap((alias) => [
    `FREELLM_MODEL_${alias.toUpperCase()}`,
    `FREELLM_MODEL_${alias.toUpperCase()}_FALLBACKS`,
  ]),
];

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe("FreeLLM same-tier-or-better routing", () => {
  it("never includes a weaker auto: profile than the alias", () => {
    const elite = resolveFreellmAlias("elite");
    assert.equal(elite.modelId, "auto:smart");
    assert.ok(!elite.fallbacks.includes("auto:standard"));
    assert.ok(!elite.fallbacks.includes("auto:fast"));
    for (const id of modelsForFreellmAlias("frontier")) {
      assert.equal(
        id === "auto:standard" || id === "auto:fast" || id === "auto:balanced",
        false,
      );
    }
  });

  it("drops weaker env fallbacks for paid aliases", () => {
    process.env.FREELLM_MODEL_FRONTIER_FALLBACKS =
      "auto:standard,auto:elite,auto:frontier,custom-op-id";
    const resolved = resolveFreellmAlias("frontier");
    assert.deepEqual(
      filterSameTierOrBetter("frontier", resolved.fallbacks),
      resolved.fallbacks,
    );
    assert.equal(resolved.fallbacks.includes("auto:standard"), false);
    assert.ok(resolved.fallbacks.includes("custom-op-id"));
  });

  it("rejects a weaker auto: primary", () => {
    process.env.FREELLM_MODEL_ELITE = "auto:standard";
    assert.throws(
      () => resolveFreellmAlias("elite"),
      (error: unknown) =>
        isFreellmError(error) && error.code === "alias_unresolved",
    );
  });
});

describe("capacity failover", () => {
  it("treats 429 / timeout / 503 as failover errors", () => {
    assert.equal(
      isCapacityFailoverError(
        new UnorouterError({ message: "x", code: "rate_limited", status: 429 }),
      ),
      true,
    );
    assert.equal(
      isCapacityFailoverError(
        new FreellmError({ message: "x", code: "timeout", status: 504 }),
      ),
      true,
    );
    assert.equal(
      isCapacityFailoverError(
        new UnorouterError({
          message: "x",
          code: "provider_unavailable",
          status: 503,
        }),
      ),
      true,
    );
    assert.equal(
      isCapacityFailoverError(
        new UnorouterError({ message: "x", code: "bad_request", status: 400 }),
      ),
      false,
    );
  });

  it("prefers UnoRouter when both keys are set", () => {
    process.env.UNOROUTER_API_KEY = "sk-test";
    process.env.FREELLM_API_KEY = "freellm-test";
    assert.deepEqual(capacityOrder(), ["unorouter", "freellm"]);
  });

  it("uses FreeLLM first when preferred or UnoRouter is missing", () => {
    process.env.FREELLM_API_KEY = "freellm-test";
    assert.deepEqual(capacityOrder(), ["freellm"]);
    process.env.UNOROUTER_API_KEY = "sk-test";
    process.env.FREELLM_PREFERRED = "1";
    assert.deepEqual(capacityOrder(), ["freellm", "unorouter"]);
  });

  it("detects length finish reasons for continuation", () => {
    assert.equal(isLengthFinish("length"), true);
    assert.equal(isLengthFinish("max_tokens"), true);
    assert.equal(isLengthFinish("stop"), false);
  });
});
