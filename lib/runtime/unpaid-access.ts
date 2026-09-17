/**
 * Staging / live-user testing without Stripe Checkout.
 * Gated by MARKETPLACE_ALLOW_UNPAID_ACCESS=1 or true. Unset in production.
 */

import { chatRentalHref } from "@/lib/urls";
import { STRIPE_NOT_CONFIGURED, isStripeConfigured } from "@/lib/stripe/config";
import type { RentalBilling } from "@/types/billing";

export type { RentalBilling };

export const UNPAID_TEST_BILLING = "unpaid_test" as const;
export const STRIPE_BILLING = "stripe" as const;

export const UNPAID_TEST_NOTICE =
  "Staging unpaid_test rental. No Stripe Checkout Session. Chat and runtime treat this like an active paid window.";

/** Accept only `1` or `true` (any case). Unset / other values stay Stripe-required. */
export function isUnpaidAccessAllowed(
  raw: string | undefined = process.env.MARKETPLACE_ALLOW_UNPAID_ACCESS,
): boolean {
  const value = raw?.trim().toLowerCase();
  return value === "1" || value === "true";
}

export function resolveRentalCreateMode(input?: {
  unpaidAccessAllowed?: boolean;
  stripeConfigured?: boolean;
}):
  | { ok: true; billing: RentalBilling }
  | { ok: false; error: string; status: 503 } {
  const unpaid = input?.unpaidAccessAllowed ?? isUnpaidAccessAllowed();
  if (unpaid) {
    return { ok: true, billing: UNPAID_TEST_BILLING };
  }
  const stripe = input?.stripeConfigured ?? isStripeConfigured();
  if (stripe) {
    return { ok: true, billing: STRIPE_BILLING };
  }
  return { ok: false, error: STRIPE_NOT_CONFIGURED, status: 503 };
}

/**
 * Unpaid test rentals are activated immediately with a window and null Stripe ids.
 * Pending Stripe checkouts also have null ids, but `startsAt` stays unset until
 * the webhook applies payment.
 */
export function inferRentalBilling(rental: {
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  startsAt: Date | string | null;
}): RentalBilling {
  if (
    !rental.stripeSessionId &&
    !rental.stripePaymentIntentId &&
    rental.startsAt
  ) {
    return UNPAID_TEST_BILLING;
  }
  return STRIPE_BILLING;
}

/**
 * After create: hosted Checkout URL, or `/chat?rentalId=` for unpaid_test.
 * Pending Stripe rentals have no chat URL until the webhook activates them.
 */
export function rentalCreateRedirectUrl(data: {
  id: string;
  billing?: string;
  checkoutUrl?: string | null;
  chatUrl?: string | null;
}): string | null {
  if (typeof data.checkoutUrl === "string" && data.checkoutUrl.startsWith("https://")) {
    return data.checkoutUrl;
  }
  if (data.billing === UNPAID_TEST_BILLING) {
    return data.chatUrl ?? chatRentalHref(data.id);
  }
  return typeof data.chatUrl === "string" ? data.chatUrl : null;
}
