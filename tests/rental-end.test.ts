import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RENTAL_CONFLICT,
  cannotEndRentalMessage,
  rentalAccessError,
  rentalEndTransition,
  rentalIsActive,
} from "../lib/runtime/rental-status";

function snapshot(
  status: string,
  endsAt: Date | null = new Date(Date.now() + 60_000),
) {
  return { status, startsAt: new Date(Date.now() - 60_000), endsAt };
}

describe("rentalEndTransition", () => {
  it("transitions active → canceled", () => {
    assert.deepEqual(rentalEndTransition("active"), {
      ok: true,
      nextStatus: "canceled",
    });
  });

  it("transitions pending → canceled (unpaid Checkout abort)", () => {
    assert.deepEqual(rentalEndTransition("pending"), {
      ok: true,
      nextStatus: "canceled",
    });
  });

  it("does not re-end an already canceled rental", () => {
    const result = rentalEndTransition("canceled");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 409);
      assert.equal(result.error, RENTAL_CONFLICT.alreadyEnded);
    }
  });

  it("rejects refunded and expired with consistent 409 copy", () => {
    const refunded = rentalEndTransition("refunded");
    assert.equal(refunded.ok, false);
    if (!refunded.ok) {
      assert.equal(refunded.status, 409);
      assert.equal(refunded.error, cannotEndRentalMessage("refunded"));
      assert.match(refunded.error, /a refunded/);
    }

    const expired = rentalEndTransition("expired");
    assert.equal(expired.ok, false);
    if (!expired.ok) {
      assert.equal(expired.status, 409);
      assert.equal(expired.error, cannotEndRentalMessage("expired"));
      assert.match(expired.error, /an expired/);
    }
  });
});

describe("rentalAccessError 409 messages", () => {
  it("uses the same ended copy that chat/connectors see after active→canceled", () => {
    const ended = rentalEndTransition("active");
    assert.equal(ended.ok, true);
    if (!ended.ok) {
      return;
    }
    const blocked = rentalAccessError(snapshot(ended.nextStatus));
    assert.ok(blocked);
    assert.equal(blocked?.status, 409);
    assert.equal(blocked?.error, RENTAL_CONFLICT.ended);
  });

  it("distinguishes pending, refunded, and window expiry", () => {
    assert.equal(
      rentalAccessError(snapshot("pending"))?.error,
      RENTAL_CONFLICT.pendingPayment,
    );
    assert.equal(
      rentalAccessError(snapshot("refunded"))?.error,
      RENTAL_CONFLICT.refunded,
    );
    assert.equal(
      rentalAccessError(snapshot("active", new Date(Date.now() - 1)))?.error,
      RENTAL_CONFLICT.inactiveOrExpired,
    );
  });

  it("treats only unexpired active windows as usable", () => {
    assert.equal(rentalIsActive(snapshot("active")), true);
    assert.equal(rentalIsActive(snapshot("canceled")), false);
    assert.equal(rentalIsActive(snapshot("pending")), false);
  });
});
