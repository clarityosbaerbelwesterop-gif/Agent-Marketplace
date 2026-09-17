import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api/guard";
import { getRentalForUser, rentalIsActive } from "@/lib/runtime/rentals";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const { id } = await context.params;
  const row = await getRentalForUser(auth.userId, id);
  if (!row) {
    return jsonError("Rental not found", 404);
  }
  return NextResponse.json({
    ...row.rental,
    startsAt: row.rental.startsAt?.toISOString() ?? null,
    endsAt: row.rental.endsAt?.toISOString() ?? null,
    createdAt: row.rental.createdAt.toISOString(),
    active: rentalIsActive(row.rental),
    agentSlug: row.agent.slug,
    agentName: row.agent.name,
    agentTier: row.agent.tier,
    billing: "unpaid_access",
  });
}
