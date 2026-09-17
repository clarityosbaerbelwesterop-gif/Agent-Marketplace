import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STRIPE_NOT_CONFIGURED } from "../lib/stripe/config";
import { rentalIsActive } from "../lib/runtime/rental-status";
import {
  STRIPE_BILLING,
  UNPAID_TEST_BILLING,
  inferRentalBilling,
  isUnpaidAccessAllowed,
  resolveRentalCreateMode,
} from "../lib/runtime/unpaid-access";

describe("MARKETPLACE_ALLOW_UNPAID_ACCESS", () => {
  it("accepts only 1 and true (any case / surrounding space)", () => {
    assert.equal(isUnpaidAccessAllowed("1"), true);
    assert.equal(isUnpaidAccessAllowed("true"), true);
    assert.equal(isUnpaidAccessAllowed("TRUE"), true);
    assert.equal(isUnpaidAccessAllowed(" True "), true);
    assert.equal(isUnpaidAccessAllowed(undefined), false);
    assert.equal(isUnpaidAccessAllowed(""), false);
    assert.equal(isUnpaidAccessAllowed("0"), false);
    assert.equal(isUnpaidAccessAllowed("false"), false);
    assert.equal(isUnpaidAccessAllowed("yes"), false);
  });

  it("lets create skip Stripe when the flag is on", () => {
    const unpaid = resolveRentalCreateMode({
      unpaidAccessAllowed: true,
      stripeConfigured: false,
    });
    assert.deepEqual(unpaid, { ok: true, billing: UNPAID_TEST_BILLING });

    const unpaidWithKeys = resolveRentalCreateMode({
      unpaidAccessAllowed: true,
      stripeConfigured: true,
    });
    assert.deepEqual(unpaidWithKeys, { ok: true, billing: UNPAID_TEST_BILLING });
  });

  it("requires Stripe and 503s when the flag is unset and keys are missing", () => {
    const stripe = resolveRentalCreateMode({
      unpaidAccessAllowed: false,
      stripeConfigured: true,
    });
    assert.deepEqual(stripe, { ok: true, billing: STRIPE_BILLING });

    const blocked = resolveRentalCreateMode({
      unpaidAccessAllowed: false,
      stripeConfigured: false,
    });
    assert.deepEqual(blocked, {
      ok: false,
      error: STRIPE_NOT_CONFIGURED,
      status: 503,
    });
  });
});

describe("inferRentalBilling", () => {
  it("marks activated windows with null Stripe ids as unpaid_test", () => {
    assert.equal(
      inferRentalBilling({
        stripeSessionId: null,
        stripePaymentIntentId: null,
        startsAt: new Date(),
      }),
      UNPAID_TEST_BILLING,
    );
  });

  it("keeps pending Stripe checkouts as stripe (null ids, no window yet)", () => {
    assert.equal(
      inferRentalBilling({
        stripeSessionId: null,
        stripePaymentIntentId: null,
        startsAt: null,
      }),
      STRIPE_BILLING,
    );
  });

  it("keeps Stripe-paid rentals as stripe even after a window starts", () => {
    assert.equal(
      inferRentalBilling({
        stripeSessionId: "cs_test_1",
        stripePaymentIntentId: null,
        startsAt: new Date(),
      }),
      STRIPE_BILLING,
    );
  });
});

describe("unpaid_test active rentals are usable like paid active", () => {
  it("passes rentalIsActive with a live window", () => {
    assert.equal(
      rentalIsActive({
        status: "active",
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 60_000),
      }),
      true,
    );
  });
});
