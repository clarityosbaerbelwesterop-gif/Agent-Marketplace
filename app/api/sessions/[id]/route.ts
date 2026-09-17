import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api/guard";
import { listSessionRuns, serializeRun } from "@/lib/runtime/runs";
import { withUserRls } from "@/lib/db";
import { agentSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  const session = await withUserRls(auth.userId, async (db) => {
    const [row] = await db
      .select()
      .from(agentSessions)
      .where(eq(agentSessions.id, id))
      .limit(1);
    return row ?? null;
  });
  if (!session) {
    return jsonError("Session not found", 404);
  }
  const runs = await listSessionRuns(auth.userId, id);
  return NextResponse.json({
    session: {
      id: session.id,
      rentalId: session.rentalId,
      workspaceId: session.workspaceId,
      status: session.status,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
    },
    runs: runs.map(serializeRun),
  });
}
