import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AGENT_TYPES,
  agentTypeForCategory,
  categoriesForAgentType,
  isDesignCategory,
} from "../lib/catalog/agent-types";
import { parseAgentsQuery } from "../lib/catalog/parse-query";

describe("agent types overlay", () => {
  it("maps catalog categories onto Coding/Marketing/Design/Sales without a re-seed", () => {
    assert.equal(agentTypeForCategory("software"), "coding");
    assert.equal(agentTypeForCategory("frontend"), "coding");
    assert.equal(agentTypeForCategory("marketing"), "marketing");
    assert.equal(agentTypeForCategory("writing"), "marketing");
    assert.equal(agentTypeForCategory("design"), "design");
    assert.equal(agentTypeForCategory("sales"), "sales");
    assert.equal(agentTypeForCategory("research"), "marketing");
    assert.equal(isDesignCategory("design"), true);
    assert.equal(isDesignCategory("software"), false);
    assert.deepEqual([...AGENT_TYPES], ["coding", "marketing", "design", "sales"]);
    assert.ok(categoriesForAgentType("coding").includes("QA"));
  });

  it("accepts type=coding as an alias for group=coding", () => {
    const parsed = parseAgentsQuery({ type: "coding" });
    assert.equal("error" in parsed, false);
    if ("error" in parsed) {
      return;
    }
    assert.equal(parsed.group, "coding");
    assert.equal(parsed.category, null);

    const mismatch = parseAgentsQuery({ type: "design", category: "sales" });
    assert.equal("error" in mismatch, true);

    const nested = parseAgentsQuery({ type: "coding", category: "frontend" });
    assert.equal("error" in nested, false);
    if ("error" in nested) {
      return;
    }
    assert.equal(nested.category, "frontend");
    assert.equal(nested.group, "coding");

    const unknown = parseAgentsQuery({ type: "wizard" });
    assert.equal("error" in unknown, true);
  });
});
