/**
 * Rental window math applied only after a verified Stripe payment.
 * Purchase starts now. Renewal extends from the later of now and current ends_at.
 */

export function hoursToMs(durationHours: number): number {
  return durationHours * 60 * 60 * 1000;
}

export function purchaseWindow(
  now: Date,
  durationHours: number,
): { startsAt: Date; endsAt: Date } {
  const startsAt = now;
  return {
    startsAt,
    endsAt: new Date(startsAt.getTime() + hoursToMs(durationHours)),
  };
}

export function renewalEndsAt(
  now: Date,
  currentEndsAt: Date | null,
  durationHours: number,
): Date {
  const base =
    currentEndsAt && currentEndsAt.getTime() > now.getTime()
      ? currentEndsAt
      : now;
  return new Date(base.getTime() + hoursToMs(durationHours));
}
