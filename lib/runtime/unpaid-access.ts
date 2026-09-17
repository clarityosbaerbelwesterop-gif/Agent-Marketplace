import { purchaseWindow } from "@/lib/stripe/windows";

/**
 * Staging-only bypass of Stripe Checkout. Production must leave this unset.
 * `true` or `1` (any case, trimmed) enables preview rentals.
 */
export const UNPAID_ACCESS_ENV = "MARKETPLACE_ALLOW_UNPAID_ACCESS";

/** Short staging window. Catalog paid durations are not granted for free. */
export const UNPAID_PREVIEW_DURATION_HOURS = 1;

/** Modest included tokens for a preview turn — not a catalog 24h/7d allotment. */
export const UNPAID_PREVIEW_USAGE_INCLUDED = 8_000;

export const UNPAID_PREVIEW_NOTICE =
  "Staging preview rental: active without Stripe Checkout. Not a payment. Window is 1 hour.";

export function isUnpaidAccessAllowed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[UNPAID_ACCESS_ENV]?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

export function unpaidPreviewWindow(now: Date = new Date()) {
  return purchaseWindow(now, UNPAID_PREVIEW_DURATION_HOURS);
}
