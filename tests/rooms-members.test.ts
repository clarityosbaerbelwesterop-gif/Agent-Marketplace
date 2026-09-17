import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_ROOM_MEMBERS, uniqueIds } from "../lib/runtime/agent-rooms";
import { roomTurnPrompt } from "../lib/runtime/agent-rooms";

describe("multi-agent rooms", () => {
  it("dedupes rental ids and caps membership", () => {
    assert.deepEqual(uniqueIds([" a ", "a", "b", ""]), ["a", "b"]);
    assert.equal(MAX_ROOM_MEMBERS, 6);
  });

  it("instructs a single coordinated turn, not a loop", () => {
    const prompt = roomTurnPrompt({
      userMessage: "Plan the launch",
      agentName: "Coder",
      peerNames: ["Marketer"],
    });
    assert.match(prompt, /Reply once/);
    assert.match(prompt, /do not loop/i);
    assert.match(prompt, /Marketer/);
  });
});
