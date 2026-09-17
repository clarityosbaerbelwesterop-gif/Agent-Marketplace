import { NextResponse } from "next/server";
import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import {
  createGroupSession,
  getOrCreateOpenSession,
  serializeSession,
} from "@/lib/runtime";

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
  const payload = body as {
    rentalId?: unknown;
    sessionId?: unknown;
    kind?: unknown;
    rentalIds?: unknown;
  };

  if (payload.kind === "group") {
    const rentalIds = Array.isArray(payload.rentalIds)
      ? payload.rentalIds.map((id) => String(id))
      : [];
    const result = await createGroupSession({
      userId: auth.userId,
      rentalIds,
    });
    if (!result.ok) {
      return jsonError(result.error, result.status);
    }
    return NextResponse.json({
      session: serializeSession(result.data.session, {
        members: result.data.members.map((member) => ({
          rentalId: member.rentalId,
          agentName: member.agentName,
          agentSlug: member.agentSlug,
          agentTier: member.agentTier,
          active: true,
        })),
      }),
    });
  }

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
  return NextResponse.json({
    session: serializeSession(result.data.session),
  });
}
