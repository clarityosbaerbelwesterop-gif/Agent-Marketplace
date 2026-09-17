import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  canPublishVerified,
  summarizeForNetwork,
  titleFromSummary,
} from "../lib/runtime/network";
import {
  groundingInstructions,
  looksUngroundedMetric,
} from "../lib/runtime/grounding";

describe("shared network summaries", () => {
  it("never stores a full dump — truncates to a short summary", () => {
    const dump = "fact. ".repeat(400);
    const summary = summarizeForNetwork(dump);
    assert.ok(summary.length <= 480);
    assert.ok(summary.endsWith("…"));
    assert.ok(titleFromSummary(summary).length <= 80);
  });

  it("only expert+ can publish verified learnings", () => {
    assert.equal(canPublishVerified("standard"), false);
    assert.equal(canPublishVerified("advanced"), false);
    assert.equal(canPublishVerified("expert"), true);
    assert.equal(canPublishVerified("frontier"), true);
  });
});

describe("anti-hallucination grounding", () => {
  it("injects unknown-when-unknown by tier", () => {
    assert.match(groundingInstructions("standard"), /unknown when unknown/i);
    assert.match(groundingInstructions("elite"), /\[memory:</);
  });

  it("flags metric claims without citations", () => {
    assert.equal(looksUngroundedMetric("Accuracy is 99% across users."), true);
    assert.equal(
      looksUngroundedMetric("Accuracy is 99% [tool:memory_search]."),
      false,
    );
    assert.equal(looksUngroundedMetric("I do not know the success rate."), false);
  });
});

describe("authenticated table grants", () => {
  it("0008/0009 grant network and room tables to authenticated", () => {
    const sql = [
      readFileSync("drizzle/0008_shared_network.sql", "utf8"),
      readFileSync("drizzle/0009_agent_rooms.sql", "utf8"),
    ].join("\n");
    assert.match(sql, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE/);
    for (const table of [
      "skill_learning_events",
      "network_nodes",
      "network_edges",
      "agent_rooms",
      "agent_room_members",
      "agent_room_messages",
    ]) {
      assert.match(sql, new RegExp(`public\\.${table}`));
    }
    assert.match(sql, /TO authenticated/);
  });
});
