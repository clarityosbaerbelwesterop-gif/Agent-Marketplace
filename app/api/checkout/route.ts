import { postCreateRentalCheckout } from "@/lib/api/create-rental";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Alias of POST /api/rentals for `{ slug, durationId }`.
 * Identity is the Neon Auth session. Paid rentals stay pending until
 * POST /api/webhooks/stripe verifies payment.
 * Response adds `url` (Checkout URL, or chat href when unpaid preview is on).
 */
export async function POST(request: Request) {
  return postCreateRentalCheckout(request, { includeUrlAlias: true });
}
