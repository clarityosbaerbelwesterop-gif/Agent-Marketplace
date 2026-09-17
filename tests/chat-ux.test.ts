import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groundingChips } from "../lib/chat/grounding";
import { applySseBlock } from "../lib/chat/sse";
import {
  getFailoverPresentation,
  getMemoryNetworkPresentation,
} from "../lib/runtime/status";

describe("chat grounding and status presentation", () => {
  it("never invents citations when the runtime omitted sources", () => {
    const empty = groundingChips({});
    assert.deepEqual(empty, [
      { kind: "unconfirmed", label: "Quelle nicht bestätigt" },
    ]);
    const skill = groundingChips({ skillVersion: "pack@1.0.0" });
    assert.equal(skill.some((chip) => chip.label === "pack@1.0.0"), true);
    assert.equal(skill.some((chip) => chip.kind === "unconfirmed"), false);
  });

  it("parses tool SSE events for the working indicator", () => {
    const names: string[] = [];
    applySseBlock(
      'event: tool\ndata: {"type":"tool","name":"github_status","status":"start"}',
      {
        onTool: (event) => names.push(`${event.name}:${event.status}`),
      },
    );
    assert.deepEqual(names, ["github_status:start"]);
  });

  it("exposes FreeLLM and memory-network as env hooks without a live meter", () => {
    const empty = getFailoverPresentation({});
    assert.equal(empty.liveMeter, false);
    assert.equal(empty.primary.configured, false);
    assert.equal(empty.failover.configured, false);
    assert.match(empty.notice, /TODO/);

    const wired = getFailoverPresentation({
      UNOROUTER_API_KEY: "urk_test",
      FREELLM_API_KEY: "fl_test",
    });
    assert.equal(wired.primary.configured, true);
    assert.equal(wired.failover.configured, true);
    assert.equal(wired.liveMeter, false);

    const memory = getMemoryNetworkPresentation({});
    assert.equal(memory.status, "unavailable");
    assert.equal(memory.source, "stub");
    const syncing = getMemoryNetworkPresentation({
      MEMORY_NETWORK_STATUS: "connected",
    });
    assert.equal(syncing.status, "connected");
    assert.equal(syncing.source, "env");
  });
});
