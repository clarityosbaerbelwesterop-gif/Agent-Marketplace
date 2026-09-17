import { NextResponse } from "next/server";
import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import { endRental } from "@/lib/runtime/rentals";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: RouteContext<"/api/rentals/[id]/end">,
) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const { id } = await context.params;

  let reason: string | undefined;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await readJsonBody(request);
    if (!json.ok) {
      return json.response;
    }
    if (json.body && typeof json.body === "object" && "reason" in json.body) {
      const value = (json.body as { reason?: unknown }).reason;
      if (typeof value === "string") {
        reason = value;
      }
    }
  }

  const result = await endRental({
    userId: auth.userId,
    rentalId: id,
    reason,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json(result.data);
}
