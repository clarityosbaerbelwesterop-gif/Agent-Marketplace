import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  filterSameTierModelIds,
  isFreeModelId,
  isPaidModelAlias,
  modelsForAlias,
  PAID_MODEL_ALIASES,
  resolveAlias,
} from "../lib/unorouter/aliases";
import { isUnorouterError } from "../lib/unorouter/errors";
import { MODEL_ALIASES, type ModelAlias } from "../lib/unorouter/types";

const ENV_KEYS = MODEL_ALIASES.flatMap((alias) => [
  `UNOROUTER_MODEL_${alias.toUpperCase()}`,
  `UNOROUTER_MODEL_${alias.toUpperCase()}_FALLBACKS`,
]);

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe("model alias fallbacks never downgrade paid → free", () => {
  it("keeps default paid alias maps free of :free IDs", () => {
    for (const alias of PAID_MODEL_ALIASES) {
      const resolved = resolveAlias(alias);
      assert.equal(isPaidModelAlias(alias), true);
      assert.equal(isFreeModelId(resolved.modelId), false);
      for (const id of resolved.fallbacks) {
        assert.equal(
          isFreeModelId(id),
          false,
          `${alias} fallback ${id} must not be :free`,
        );
      }
      for (const id of modelsForAlias(alias)) {
        assert.equal(isFreeModelId(id), false);
      }
    }
  });

  it("allows :free only on the standard alias", () => {
    const standard = resolveAlias("standard");
    assert.equal(isPaidModelAlias("standard"), false);
    assert.equal(isFreeModelId(standard.modelId), true);
    assert.ok(standard.fallbacks.every((id) => isFreeModelId(id)));
  });

  it("strips :free IDs from paid env fallbacks", () => {
    process.env.UNOROUTER_MODEL_FRONTIER_FALLBACKS =
      "claude-opus-4-8,gpt-oss-120b:free,deepseek-v4-flash:free";
    const resolved = resolveAlias("frontier");
    assert.deepEqual(resolved.fallbacks, ["claude-opus-4-8"]);
    assert.equal(
      resolved.fallbacks.some((id) => isFreeModelId(id)),
      false,
    );
  });

  it("rejects a paid primary that is a :free model", () => {
    process.env.UNOROUTER_MODEL_ELITE = "gpt-oss-120b:free";
    assert.throws(
      () => resolveAlias("elite"),
      (error: unknown) =>
        isUnorouterError(error) &&
        error.code === "alias_unresolved" &&
        error.status === 503 &&
        /:free/.test(error.message),
    );
  });

  it("filterSameTierModelIds drops free IDs for every paid alias", () => {
    const mixed = ["gpt-5.4", "claude-opus-4-8", "gemma-4-31b-it:free"];
    for (const alias of PAID_MODEL_ALIASES as readonly ModelAlias[]) {
      assert.deepEqual(filterSameTierModelIds(alias, mixed), [
        "gpt-5.4",
        "claude-opus-4-8",
      ]);
    }
    assert.deepEqual(filterSameTierModelIds("standard", mixed), mixed);
  });
});
