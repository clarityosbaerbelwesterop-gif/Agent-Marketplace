import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api/guard";
import { getRunForUser, serializeRun } from "@/lib/runtime/runs";

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
  const row = await getRunForUser(auth.userId, id);
  if (!row) {
    return jsonError("Run not found", 404);
  }
  return NextResponse.json({
    run: serializeRun(row.run),
    sessionId: row.session.id,
    rentalId: row.rental.id,
    agentSlug: row.agentSlug,
    agentName: row.agentName,
  });
}
