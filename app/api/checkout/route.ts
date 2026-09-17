import { postCreateRentalCheckout } from "@/lib/api/create-rental";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Alias of POST /api/rentals for `{ slug, durationId }`.
 * Identity is the Neon Auth session. The rental stays pending until
 * POST /api/webhooks/stripe verifies payment.
 * Response adds `url` (same value as `checkoutUrl`) for hosted Checkout redirects.
 */
export async function POST(request: Request) {
  return postCreateRentalCheckout(request, { includeUrlAlias: true });
}
