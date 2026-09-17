import { and, eq, sql } from "drizzle-orm";
import { getDb, type Database } from "@/lib/db";
import { rentalPayments, stripeEvents } from "@/lib/db/schema";
import { applyPaidPayment } from "./apply";
import { getStripe } from "./client";
import { getStripeWebhookSecret } from "./config";
import { readCheckoutMetadata } from "./checkout";
import type Stripe from "stripe";

function asDb(tx: unknown): Database {
  return tx as Database;
}

function stripeId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
}

async function findPaymentId(
  db: Database,
  input: {
    paymentId?: string;
    stripeSessionId?: string | null;
    stripePaymentIntentId?: string | null;
  },
): Promise<string | null> {
  if (input.paymentId) {
    return input.paymentId;
  }
  if (input.stripeSessionId) {
    const [bySession] = await db
      .select({ id: rentalPayments.id })
      .from(rentalPayments)
      .where(eq(rentalPayments.stripeSessionId, input.stripeSessionId))
      .limit(1);
    if (bySession) {
      return bySession.id;
    }
  }
  if (input.stripePaymentIntentId) {
    const [byIntent] = await db
      .select({ id: rentalPayments.id })
      .from(rentalPayments)
      .where(
        eq(rentalPayments.stripePaymentIntentId, input.stripePaymentIntentId),
      )
      .limit(1);
    if (byIntent) {
      return byIntent.id;
    }
  }
  return null;
}

async function handleCheckoutSession(
  db: Database,
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const meta = readCheckoutMetadata(session.metadata);
  const paymentIntentId = stripeId(session.payment_intent);
  const paymentId = await findPaymentId(db, {
    paymentId: meta.paymentId,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
  });
  if (!paymentId) {
    return meta.rentalId ?? null;
  }

  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return meta.rentalId ?? null;
  }

  const result = await applyPaidPayment(db, {
    paymentId,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
  });
  return result.rentalId ?? meta.rentalId ?? null;
}

async function handlePaymentIntent(
  db: Database,
  intent: Stripe.PaymentIntent,
): Promise<string | null> {
  const meta = readCheckoutMetadata(intent.metadata);
  const paymentId = await findPaymentId(db, {
    paymentId: meta.paymentId,
    stripePaymentIntentId: intent.id,
  });
  if (!paymentId) {
    return meta.rentalId ?? null;
  }
  const result = await applyPaidPayment(db, {
    paymentId,
    stripePaymentIntentId: intent.id,
  });
  return result.rentalId ?? meta.rentalId ?? null;
}

async function handleCheckoutExpired(
  db: Database,
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const meta = readCheckoutMetadata(session.metadata);
  const where = meta.paymentId
    ? eq(rentalPayments.id, meta.paymentId)
    : eq(rentalPayments.stripeSessionId, session.id);
  await db
    .update(rentalPayments)
    .set({ status: "canceled" })
    .where(and(where, sql`${rentalPayments.appliedAt} is null`));
  return meta.rentalId ?? null;
}

export async function constructStripeEvent(
  payload: string,
  signature: string | null,
): Promise<
  { ok: true; event: Stripe.Event } | { ok: false; error: string; status: number }
> {
  if (!signature) {
    return { ok: false, error: "Missing stripe-signature header", status: 400 };
  }
  try {
    const event = await getStripe().webhooks.constructEventAsync(
      payload,
      signature,
      getStripeWebhookSecret(),
    );
    return { ok: true, event };
  } catch {
    return { ok: false, error: "Invalid Stripe signature", status: 400 };
  }
}

/**
 * Verify-then-apply. Duplicate Stripe event ids are stored uniquely and skipped.
 * Checkout success URLs never activate a rental; only this path does.
 *
 * Event insert and apply run in one transaction so a failed apply rolls back
 * the event row and Stripe can retry.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<{
  duplicate: boolean;
  type: string;
  rentalId: string | null;
}> {
  return getDb().transaction(async (tx) => {
    const db = asDb(tx);
    const inserted = await db
      .insert(stripeEvents)
      .values({
        id: event.id,
        type: event.type,
      })
      .onConflictDoNothing()
      .returning({ id: stripeEvents.id });

    if (inserted.length === 0) {
      return { duplicate: true, type: event.type, rentalId: null };
    }

    let rentalId: string | null = null;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        rentalId = await handleCheckoutSession(
          db,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "payment_intent.succeeded":
        rentalId = await handlePaymentIntent(
          db,
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        rentalId = await handleCheckoutExpired(
          db,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      default:
        break;
    }

    if (rentalId) {
      await db
        .update(stripeEvents)
        .set({ rentalId })
        .where(eq(stripeEvents.id, event.id));
    }

    return { duplicate: false, type: event.type, rentalId };
  });
}
