import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api/guard";
import { renewRentalCheckout } from "@/lib/runtime/rentals";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: RouteContext<"/api/rentals/[id]/renew">,
) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }

  let durationId: string | undefined;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body: unknown = await request.json();
      if (
        body &&
        typeof body === "object" &&
        typeof (body as { durationId?: unknown }).durationId === "string"
      ) {
        durationId = (body as { durationId: string }).durationId;
      }
    } catch {
      return jsonError("Invalid JSON", 400);
    }
  }

  const { id } = await context.params;
  const result = await renewRentalCheckout({
    userId: auth.userId,
    rentalId: id,
    durationId,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json(result.data);
}
