import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AGENT_CATEGORIES,
} from "../lib/catalog/constants";
import {
  AGENT_FAMILIES,
  assertFamilyCoversKnownCategories,
  categoriesForFamily,
  familyFromCategory,
  isAgentFamily,
} from "../lib/catalog/family";
import { parseAgentsQuery } from "../lib/catalog/parse-query";

describe("agent family mapping", () => {
  it("covers every catalog category", () => {
    assertFamilyCoversKnownCategories();
    for (const category of AGENT_CATEGORIES) {
      assert.ok(familyFromCategory(category), category);
    }
  });

  it("maps coding / marketing / design / sales heuristics", () => {
    assert.equal(familyFromCategory("software"), "coding");
    assert.equal(familyFromCategory("QA"), "coding");
    assert.equal(familyFromCategory("marketing"), "marketing");
    assert.equal(familyFromCategory("design"), "design");
    assert.equal(familyFromCategory("sales"), "sales");
    assert.ok(categoriesForFamily("coding").includes("frontend"));
  });

  it("parses family= and category=coding alias without rejecting", () => {
    const family = parseAgentsQuery(new URLSearchParams("family=coding"));
    assert.equal("error" in family, false);
    if (!("error" in family)) {
      assert.equal(family.family, "coding");
      assert.equal(family.group, "coding");
      assert.equal(family.category, null);
    }
    const alias = parseAgentsQuery(new URLSearchParams("category=coding"));
    assert.equal("error" in alias, false);
    if (!("error" in alias)) {
      assert.equal(alias.family, "coding");
      assert.equal(alias.category, null);
    }
    const unknown = parseAgentsQuery(new URLSearchParams("family=legal"));
    assert.equal("error" in unknown, true);
    assert.ok(isAgentFamily(AGENT_FAMILIES[0]));
  });
});
