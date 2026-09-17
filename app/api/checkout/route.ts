import { postCreateRentalCheckout } from "@/lib/api/create-rental";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Alias of POST /api/rentals for `{ slug, durationId }`.
 * Identity is the Neon Auth session. Stripe path: rental stays pending until
 * POST /api/webhooks/stripe verifies payment. MARKETPLACE_ALLOW_UNPAID_ACCESS:
 * rental is active immediately (`billing=unpaid_test`, no Checkout Session).
 * Response adds `url` (`checkoutUrl`, or `/chat?rentalId=` in unpaid test mode).
 */
export async function POST(request: Request) {
  return postCreateRentalCheckout(request, { includeUrlAlias: true });
}
