import { NextResponse } from "next/server";
import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import { getOrCreateOpenSession } from "@/lib/runtime/runs";
import { rentalIsActive } from "@/lib/runtime/rentals";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const body = json.body;
  if (!body || typeof body !== "object") {
    return jsonError("Invalid JSON", 400);
  }
  const payload = body as { rentalId?: unknown; sessionId?: unknown };
  const rentalId = String(payload.rentalId ?? "");
  if (!rentalId) {
    return jsonError("rentalId is required", 400);
  }
  const result = await getOrCreateOpenSession({
    userId: auth.userId,
    rentalId,
    sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  if (!rentalIsActive(result.data.rental)) {
    return jsonError("Rental is not active", 409);
  }
  return NextResponse.json({
    session: {
      id: result.data.session.id,
      rentalId: result.data.session.rentalId,
      workspaceId: result.data.session.workspaceId,
      status: result.data.session.status,
      openedAt: result.data.session.openedAt.toISOString(),
      closedAt: result.data.session.closedAt?.toISOString() ?? null,
    },
  });
}
