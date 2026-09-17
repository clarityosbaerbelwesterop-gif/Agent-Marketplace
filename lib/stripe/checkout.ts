import type { AgentRentalDuration } from "@/lib/db/json";
import { getStripe } from "./client";
import { getAppBaseUrl } from "./config";

export type CheckoutKind = "purchase" | "renewal";

const METADATA_KEYS = {
  rentalId: "rentalId",
  paymentId: "paymentId",
  kind: "kind",
} as const;

export function checkoutMetadata(input: {
  rentalId: string;
  paymentId: string;
  kind: CheckoutKind;
}): Record<string, string> {
  return {
    [METADATA_KEYS.rentalId]: input.rentalId,
    [METADATA_KEYS.paymentId]: input.paymentId,
    [METADATA_KEYS.kind]: input.kind,
  };
}

export function readCheckoutMetadata(
  metadata: Record<string, string> | null | undefined,
): { rentalId?: string; paymentId?: string; kind?: CheckoutKind } {
  if (!metadata) {
    return {};
  }
  const kind = metadata[METADATA_KEYS.kind];
  return {
    rentalId: metadata[METADATA_KEYS.rentalId],
    paymentId: metadata[METADATA_KEYS.paymentId],
    kind: kind === "purchase" || kind === "renewal" ? kind : undefined,
  };
}

export async function createCheckoutSession(input: {
  rentalId: string;
  paymentId: string;
  kind: CheckoutKind;
  agentName: string;
  duration: AgentRentalDuration;
  customerEmail?: string | null;
}) {
  const stripe = getStripe();
  const base = getAppBaseUrl();
  const metadata = checkoutMetadata(input);
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: input.rentalId,
      success_url: `${base}/chat?rentalId=${encodeURIComponent(input.rentalId)}`,
      cancel_url: `${base}/checkout?rentalId=${encodeURIComponent(input.rentalId)}&canceled=1`,
      customer_email: input.customerEmail?.trim() || undefined,
      metadata,
      payment_intent_data: { metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.duration.currency.toLowerCase(),
            unit_amount: input.duration.priceCents,
            product_data: {
              name: `${input.agentName} · ${input.duration.label}`,
              description:
                input.kind === "renewal"
                  ? `Renewal · ${input.duration.durationHours}h access`
                  : `Rental · ${input.duration.durationHours}h access`,
            },
          },
        },
      ],
    },
    { idempotencyKey: `rentalpay_${input.paymentId}` },
  );

  if (!session.url) {
    throw new Error("Stripe Checkout Session was created without a URL.");
  }

  return session;
}

export async function getOpenCheckoutUrl(
  stripeSessionId: string,
): Promise<string | null> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
  if (session.status === "open" && session.url) {
    return session.url;
  }
  return null;
}

export async function expireOpenCheckoutSession(
  stripeSessionId: string,
): Promise<boolean> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
    if (session.status !== "open") {
      return false;
    }
    await stripe.checkout.sessions.expire(stripeSessionId);
    return true;
  } catch {
    return false;
  }
}
