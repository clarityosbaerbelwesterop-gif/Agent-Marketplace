import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api/guard";
import { postCreateRentalCheckout } from "@/lib/api/create-rental";
import { listRentals } from "@/lib/runtime/rentals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const items = await listRentals(auth.userId);
  return NextResponse.json({ items });
}

/**
 * Create a pending rental + Stripe Checkout Session, or an active 1-hour
 * preview rental when `MARKETPLACE_ALLOW_UNPAID_ACCESS=true`.
 * Same body contract as POST /api/checkout (`slug`, `durationId`).
 * Checkout additionally aliases `url` = `checkoutUrl` (or `chatUrl` in preview).
 */
export async function POST(request: Request) {
  return postCreateRentalCheckout(request);
}
