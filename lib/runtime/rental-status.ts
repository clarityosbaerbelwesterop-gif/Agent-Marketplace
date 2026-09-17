/**
 * Pure rental status helpers (no Stripe / DB). Chat, sessions, connectors,
 * and POST /api/rentals/[id]/end share these 409 messages.
 *
 * `status=active` windows are usable regardless of billing: Stripe-paid and
 * staging `unpaid_test` rentals both pass `rentalIsActive` / `rentalAccessError`.
 */

export const RENTAL_ENDABLE_STATUSES = ["pending", "active"] as const;

export type RentalEndableStatus = (typeof RENTAL_ENDABLE_STATUSES)[number];

export const RENTAL_CONFLICT = {
  ended: "Rental has ended",
  alreadyEnded: "Rental has already ended",
  refunded: "Rental was refunded",
  pendingPayment: "Rental is pending payment",
  inactiveOrExpired: "Rental is not active or has expired",
} as const;

export type RentalAccessSnapshot = {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type RentalConflict = { error: string; status: 409 };

export type RentalEndTransition =
  | { ok: true; nextStatus: "canceled" }
  | { ok: false; error: string; status: 409 };

function indefiniteArticle(word: string): "a" | "an" {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

export function cannotEndRentalMessage(status: string): string {
  return `Cannot end ${indefiniteArticle(status)} ${status} rental`;
}

export function rentalIsActive(rental: RentalAccessSnapshot): boolean {
  if (rental.status !== "active") {
    return false;
  }
  const now = Date.now();
  if (rental.startsAt && rental.startsAt.getTime() > now) {
    return false;
  }
  if (rental.endsAt && rental.endsAt.getTime() < now) {
    return false;
  }
  return true;
}

export function rentalAccessError(
  rental: RentalAccessSnapshot,
): RentalConflict | null {
  if (rental.status === "canceled") {
    return { error: RENTAL_CONFLICT.ended, status: 409 };
  }
  if (rental.status === "refunded") {
    return { error: RENTAL_CONFLICT.refunded, status: 409 };
  }
  if (rental.status === "pending") {
    return { error: RENTAL_CONFLICT.pendingPayment, status: 409 };
  }
  if (!rentalIsActive(rental)) {
    return { error: RENTAL_CONFLICT.inactiveOrExpired, status: 409 };
  }
  return null;
}

/**
 * Owner-end status machine: pending|active → canceled.
 * Refunded / expired / already-canceled rentals stay put and 409.
 */
export function rentalEndTransition(status: string): RentalEndTransition {
  if (status === "canceled") {
    return {
      ok: false,
      error: RENTAL_CONFLICT.alreadyEnded,
      status: 409,
    };
  }
  if (status === "refunded" || status === "expired") {
    return {
      ok: false,
      error: cannotEndRentalMessage(status),
      status: 409,
    };
  }
  if (
    status !== "pending" &&
    status !== "active"
  ) {
    return {
      ok: false,
      error: cannotEndRentalMessage(status),
      status: 409,
    };
  }
  return { ok: true, nextStatus: "canceled" };
}
