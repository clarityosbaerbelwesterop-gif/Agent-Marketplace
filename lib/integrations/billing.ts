import { isStripeConfigured } from "@/lib/stripe/config";
import type { PaymentConnectionStatus } from "@/types/billing";

/** Stripe lives in `lib/stripe/`. This helper only reports whether secrets are present. */
export async function getPaymentConnectionStatus(): Promise<PaymentConnectionStatus> {
  return isStripeConfigured() ? "configured" : "not_configured";
}
