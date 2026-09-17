import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AGENT_CATEGORY_GROUPS,
  CATEGORY_GROUP_MEMBERS,
  categoryGroupFor,
  categoriesForGroup,
} from "../lib/catalog/groups";
import { parseAgentsQuery } from "../lib/catalog/parse-query";

describe("first-class category groups", () => {
  it("maps catalog specializations without inventing extra categories", () => {
    assert.deepEqual([...AGENT_CATEGORY_GROUPS], ["coding", "marketing", "design", "sales"]);
    assert.equal(categoryGroupFor("software"), "coding");
    assert.equal(categoryGroupFor("frontend"), "coding");
    assert.equal(categoryGroupFor("marketing"), "marketing");
    assert.equal(categoryGroupFor("design"), "design");
    assert.equal(categoryGroupFor("sales"), "sales");
    assert.equal(categoryGroupFor("writing"), "marketing");
    assert.ok(categoriesForGroup("coding").includes("QA"));
    assert.ok(CATEGORY_GROUP_MEMBERS.marketing.includes("research"));
  });

  it("accepts group=coding on the catalog query parser", () => {
    const parsed = parseAgentsQuery(new URLSearchParams("group=coding&pageSize=1"));
    assert.equal("error" in parsed, false);
    if ("error" in parsed) {
      return;
    }
    assert.equal(parsed.group, "coding");
    assert.equal(parsed.category, null);
  });

  it("rejects a category that is not in the selected group", () => {
    const parsed = parseAgentsQuery(
      new URLSearchParams("group=sales&category=design"),
    );
    assert.equal("error" in parsed, true);
    if ("error" in parsed) {
      assert.match(parsed.error, /not in the sales group/);
    }
  });
});
