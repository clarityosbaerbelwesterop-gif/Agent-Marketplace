import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api/guard";
import { getRentalForUser, serializeRental } from "@/lib/runtime/rentals";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/rentals/[id]">,
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
  return NextResponse.json(
    serializeRental(row.rental, {
      agentSlug: row.agent.slug,
      agentName: row.agent.name,
      agentTier: row.agent.tier,
    }),
  );
}
