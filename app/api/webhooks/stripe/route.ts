import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/guard";
import {
  STRIPE_WEBHOOK_NOT_CONFIGURED,
  constructStripeEvent,
  isStripeWebhookConfigured,
  processStripeEvent,
} from "@/lib/stripe";
import { isDatabaseConfigured } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

/**
 * Stripe signs this request. Do not trust `/chat?rentalId=` redirects.
 * Activate/extend rentals only after signature verification.
 */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return jsonError("DATABASE_URL is not configured", 503);
  }
  if (!isStripeWebhookConfigured()) {
    return jsonError(STRIPE_WEBHOOK_NOT_CONFIGURED, 503);
  }

  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  const verified = await constructStripeEvent(payload, signature);
  if (!verified.ok) {
    return jsonError(verified.error, verified.status);
  }

  const result = await processStripeEvent(verified.event);
  return NextResponse.json({ received: true, ...result });
}
