import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  overlappingRentalWindow,
  parseRentalIdList,
} from "../lib/runtime/group-window";

describe("gruppenchat overlap window", () => {
  it("requires two rentals and uses the intersection of paid windows", () => {
    const now = Date.parse("2026-09-17T12:00:00.000Z");
    const tooFew = overlappingRentalWindow(
      [{ startsAt: "2026-09-17T10:00:00.000Z", endsAt: "2026-09-17T18:00:00.000Z" }],
      now,
    );
    assert.equal(tooFew.ok, false);
    if (!tooFew.ok) {
      assert.equal(tooFew.reason, "too_few");
    }

    const overlap = overlappingRentalWindow(
      [
        { startsAt: "2026-09-17T10:00:00.000Z", endsAt: "2026-09-17T18:00:00.000Z" },
        { startsAt: "2026-09-17T11:00:00.000Z", endsAt: "2026-09-17T20:00:00.000Z" },
      ],
      now,
    );
    assert.equal(overlap.ok, true);
    if (overlap.ok) {
      assert.equal(overlap.startsAt.toISOString(), "2026-09-17T11:00:00.000Z");
      assert.equal(overlap.endsAt.toISOString(), "2026-09-17T18:00:00.000Z");
    }
  });

  it("rejects expired or non-overlapping windows", () => {
    const now = Date.parse("2026-09-17T19:00:00.000Z");
    const expired = overlappingRentalWindow(
      [
        { startsAt: "2026-09-17T10:00:00.000Z", endsAt: "2026-09-17T18:00:00.000Z" },
        { startsAt: "2026-09-17T11:00:00.000Z", endsAt: "2026-09-17T18:30:00.000Z" },
      ],
      now,
    );
    assert.equal(expired.ok, false);
    if (!expired.ok) {
      assert.equal(expired.reason, "expired");
    }

    const disjoint = overlappingRentalWindow(
      [
        { startsAt: "2026-09-17T10:00:00.000Z", endsAt: "2026-09-17T12:00:00.000Z" },
        { startsAt: "2026-09-17T13:00:00.000Z", endsAt: "2026-09-17T15:00:00.000Z" },
      ],
      Date.parse("2026-09-17T11:00:00.000Z"),
    );
    assert.equal(disjoint.ok, false);
    if (!disjoint.ok) {
      assert.equal(disjoint.reason, "no_overlap");
    }
  });

  it("deduplicates rental ids from the query string", () => {
    assert.deepEqual(parseRentalIdList(" a, b, a, ,c "), ["a", "b", "c"]);
    assert.deepEqual(parseRentalIdList(undefined), []);
  });
});
