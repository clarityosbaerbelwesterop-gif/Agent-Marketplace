import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api/guard";
import { listGroupMembers, listSessionRuns, serializeRun, serializeSession } from "@/lib/runtime";
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
  const [runs, members] = await Promise.all([
    listSessionRuns(auth.userId, id),
    session.kind === "group" ? listGroupMembers(auth.userId, id) : Promise.resolve([]),
  ]);
  return NextResponse.json({
    session: serializeSession(session, {
      members: members.map((member) => ({
        rentalId: member.rentalId,
        agentName: member.agentName,
        agentSlug: member.agentSlug,
        agentTier: member.agentTier,
        active: member.active,
      })),
    }),
    runs: runs.map(serializeRun),
  });
}
