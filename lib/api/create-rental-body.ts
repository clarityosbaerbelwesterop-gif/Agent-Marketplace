export type ParsedCreateRentalBody =
  | { ok: true; slug: string; durationId?: string }
  | { ok: false; error: string; status: 400 };

/**
 * Shared POST body for `/api/rentals` and `/api/checkout`.
 * Both routes must stay on this parser so Checkout cannot drift after rental-end.
 */
export function parseCreateRentalBody(body: unknown): ParsedCreateRentalBody {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON", status: 400 };
  }
  const payload = body as { slug?: unknown; durationId?: unknown };
  if (payload.slug !== undefined && typeof payload.slug !== "string") {
    return { ok: false, error: "slug is required", status: 400 };
  }
  const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
  if (!slug) {
    return { ok: false, error: "slug is required", status: 400 };
  }
  if (
    payload.durationId !== undefined &&
    payload.durationId !== null &&
    typeof payload.durationId !== "string"
  ) {
    return { ok: false, error: "durationId must be a string", status: 400 };
  }
  const durationId =
    typeof payload.durationId === "string" && payload.durationId.trim()
      ? payload.durationId
      : undefined;
  return { ok: true, slug, durationId };
}
