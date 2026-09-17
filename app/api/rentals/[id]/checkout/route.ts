import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api/guard";
import { resumeRentalCheckout } from "@/lib/runtime/rentals";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/rentals/[id]/checkout">,
) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const { id } = await context.params;
  const result = await resumeRentalCheckout({
    userId: auth.userId,
    rentalId: id,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json(result.data);
}
