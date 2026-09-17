import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMemoryKind, isMemoryVisibility } from "../lib/runtime/memory";
import { MAX_GROUP_RENTALS, countRemainingMembers, groupRoomsToClose, validateGroupRentalIds } from "../lib/runtime/rooms";
import { CONNECTOR_IDS } from "../lib/connectors/types";
import { modelsForFreellmAlias, resolveFreellmAlias } from "../lib/freellm/aliases";

describe("shared memory visibility helpers", () => {
  it("only allows documented kinds and visibilities", () => {
    assert.equal(isMemoryKind("fact"), true);
    assert.equal(isMemoryKind("shared"), false);
    assert.equal(isMemoryVisibility("workspace"), true);
    assert.equal(isMemoryVisibility("global"), false);
  });
});

describe("group session membership rules", () => {
  it("requires 2–4 unique rental ids before touching the database", () => {
    assert.equal(validateGroupRentalIds(["a"]).ok, false);
    assert.equal(validateGroupRentalIds(["a", "a"]).ok, false);
    const ok = validateGroupRentalIds([" a ", "b", "b"]);
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.deepEqual(ok.rentalIds, ["a", "b"]);
    }
    const tooMany = Array.from({ length: MAX_GROUP_RENTALS + 1 }, (_, i) => String(i));
    assert.equal(validateGroupRentalIds(tooMany).ok, false);
  });

  it("closes a group room when fewer than two paid members remain", () => {
    const remaining = countRemainingMembers([
      { sessionId: "room-a" },
      { sessionId: "room-a" },
      { sessionId: "room-b" },
    ]);
    assert.deepEqual(groupRoomsToClose(["room-a", "room-b"], remaining), ["room-b"]);
  });
});

describe("expanded first-wave connectors", () => {
  it("includes Higgsfield, LinkedIn, Meta, and Google Search stubs", () => {
    for (const id of ["higgsfield", "linkedin", "meta", "google-search"] as const) {
      assert.ok(CONNECTOR_IDS.includes(id), id);
    }
  });
});

describe("FreeLLM alias snapshot", () => {
  it("uses documented auto:* strategies, not invented model names", () => {
    const frontier = resolveFreellmAlias("frontier");
    assert.equal(frontier.paidFailoverOnly, true);
    assert.match(frontier.modelId, /^auto/);
    assert.ok(modelsForFreellmAlias("standard").includes("auto:fast"));
  });
});
