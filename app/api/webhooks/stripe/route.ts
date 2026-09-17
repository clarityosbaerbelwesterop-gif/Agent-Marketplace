import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/guard";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import { ensurePendingConnectorGrantsForRental } from "@/lib/connectors";
import {
  STRIPE_WEBHOOK_NOT_CONFIGURED,
  constructStripeEvent,
  isStripeWebhookConfigured,
  processStripeEvent,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  if (!result.duplicate && result.rentalId) {
    try {
      await ensurePendingConnectorGrantsForRental(result.rentalId);
    } catch {
      // Payment already applied. Grant stubs are best-effort metadata.
    }
  }
  return NextResponse.json({ received: true, ...result });
}
