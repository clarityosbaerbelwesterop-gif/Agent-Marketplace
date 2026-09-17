import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { rentalPayments, rentals } from "@/lib/db/schema";
import { purchaseWindow, renewalEndsAt } from "./windows";

type DbLike = Pick<Database, "select" | "update">;

/**
 * Apply a paid Checkout / PaymentIntent exactly once.
 * `UPDATE ... WHERE applied_at IS NULL` is the claim; a second event for the
 * same payment row is a no-op and must not extend the rental again.
 */
export async function applyPaidPayment(
  db: DbLike,
  input: {
    paymentId: string;
    stripeSessionId?: string | null;
    stripePaymentIntentId?: string | null;
  },
): Promise<{ applied: boolean; rentalId: string | null }> {
  const [payment] = await db
    .select()
    .from(rentalPayments)
    .where(eq(rentalPayments.id, input.paymentId))
    .limit(1);
  if (!payment) {
    return { applied: false, rentalId: null };
  }

  const [rental] = await db
    .select()
    .from(rentals)
    .where(eq(rentals.id, payment.rentalId))
    .limit(1);
  if (!rental) {
    return { applied: false, rentalId: payment.rentalId };
  }

  if (rental.status === "canceled" || rental.status === "refunded") {
    return { applied: false, rentalId: rental.id };
  }

  const ids: Partial<typeof rentalPayments.$inferInsert> = {};
  if (input.stripeSessionId) {
    ids.stripeSessionId = input.stripeSessionId;
  }
  if (input.stripePaymentIntentId) {
    ids.stripePaymentIntentId = input.stripePaymentIntentId;
  }
  if (Object.keys(ids).length > 0) {
    await db
      .update(rentalPayments)
      .set(ids)
      .where(
        and(
          eq(rentalPayments.id, payment.id),
          sql`${rentalPayments.appliedAt} is null`,
        ),
      );
  }

  const [claimed] = await db
    .update(rentalPayments)
    .set({
      status: "paid",
      appliedAt: new Date(),
    })
    .where(
      and(
        eq(rentalPayments.id, payment.id),
        sql`${rentalPayments.appliedAt} is null`,
        sql`${rentalPayments.status} <> 'canceled'`,
      ),
    )
    .returning();

  if (!claimed) {
    return { applied: false, rentalId: rental.id };
  }

  const now = new Date();
  const sessionId = claimed.stripeSessionId ?? input.stripeSessionId ?? null;
  const paymentIntentId =
    claimed.stripePaymentIntentId ?? input.stripePaymentIntentId ?? null;

  const extendExisting =
    claimed.kind === "renewal" || rental.status === "active";

  if (!extendExisting) {
    const window = purchaseWindow(now, claimed.durationHours);
    await db
      .update(rentals)
      .set({
        status: "active",
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        usageIncluded: claimed.usageIncluded,
        stripeSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
      })
      .where(eq(rentals.id, rental.id));
  } else {
    const endsAt = renewalEndsAt(now, rental.endsAt, claimed.durationHours);
    await db
      .update(rentals)
      .set({
        status: "active",
        startsAt: rental.startsAt ?? now,
        endsAt,
        usageIncluded: rental.usageIncluded + claimed.usageIncluded,
        stripeSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
      })
      .where(eq(rentals.id, rental.id));
  }

  return { applied: true, rentalId: rental.id };
}
