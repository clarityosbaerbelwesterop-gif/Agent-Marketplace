import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  UNPAID_ACCESS_ENV,
  UNPAID_PREVIEW_DURATION_HOURS,
  isUnpaidAccessAllowed,
  unpaidPreviewWindow,
} from "../lib/runtime/unpaid-access";

describe("MARKETPLACE_ALLOW_UNPAID_ACCESS", () => {
  it("enables when the value is true or 1 (trimmed, case-insensitive)", () => {
    assert.equal(isUnpaidAccessAllowed({ [UNPAID_ACCESS_ENV]: "true" }), true);
    assert.equal(isUnpaidAccessAllowed({ [UNPAID_ACCESS_ENV]: "TRUE" }), true);
    assert.equal(isUnpaidAccessAllowed({ [UNPAID_ACCESS_ENV]: " True " }), true);
    assert.equal(isUnpaidAccessAllowed({ [UNPAID_ACCESS_ENV]: "1" }), true);
  });

  it("stays off when unset, false, or any other value", () => {
    assert.equal(isUnpaidAccessAllowed({}), false);
    assert.equal(isUnpaidAccessAllowed({ [UNPAID_ACCESS_ENV]: "" }), false);
    assert.equal(isUnpaidAccessAllowed({ [UNPAID_ACCESS_ENV]: "false" }), false);
    assert.equal(isUnpaidAccessAllowed({ [UNPAID_ACCESS_ENV]: "yes" }), false);
  });

  it("opens a 1-hour preview window from now", () => {
    const now = new Date("2026-09-17T19:00:00.000Z");
    const window = unpaidPreviewWindow(now);
    assert.equal(window.startsAt.toISOString(), now.toISOString());
    assert.equal(
      window.endsAt.getTime() - window.startsAt.getTime(),
      UNPAID_PREVIEW_DURATION_HOURS * 60 * 60 * 1000,
    );
  });
});
