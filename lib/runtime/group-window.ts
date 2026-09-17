export type RentalWindow = {
  startsAt: string | Date | null;
  endsAt: string | Date | null;
};

export type OverlapResult =
  | { ok: true; startsAt: Date; endsAt: Date }
  | { ok: false; reason: "too_few" | "no_overlap" | "expired" };

function toMillis(value: string | Date | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : fallback;
}

/**
 * Overlapping paid window for a Gruppenchat. Requires 2+ rentals.
 * Open-ended `endsAt` is treated as still open; missing `startsAt` as already started.
 */
export function overlappingRentalWindow(
  rentals: RentalWindow[],
  now = Date.now(),
): OverlapResult {
  if (rentals.length < 2) {
    return { ok: false, reason: "too_few" };
  }
  const start = Math.max(
    ...rentals.map((row) => toMillis(row.startsAt, 0)),
  );
  const end = Math.min(
    ...rentals.map((row) => toMillis(row.endsAt, Number.POSITIVE_INFINITY)),
  );
  if (!(start < end)) {
    return { ok: false, reason: "no_overlap" };
  }
  if (end <= now) {
    return { ok: false, reason: "expired" };
  }
  return {
    ok: true,
    startsAt: new Date(start),
    endsAt: new Date(end),
  };
}

export function parseRentalIdList(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
