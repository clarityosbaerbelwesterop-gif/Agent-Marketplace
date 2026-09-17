import { jsonError, requireApiUser } from "@/lib/api/guard";
import {
  getRoomForUser,
  serializeRoomMessage,
  workingRunsForRoom,
} from "@/lib/runtime/agent-rooms";
import { rentalIsActive } from "@/lib/runtime/rental-status";

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
  const bundle = await getRoomForUser(auth.userId, id);
  if (!bundle) {
    return jsonError("Room not found", 404);
  }
  const runIds = bundle.messages
    .map((row) => row.runId)
    .filter((value): value is string => Boolean(value));
  const runs = await workingRunsForRoom(auth.userId, runIds);
  const runById = new Map(runs.map((run) => [run.id, run]));
  return Response.json({
    room: {
      id: bundle.room.id,
      workspaceId: bundle.room.workspaceId,
      title: bundle.room.title,
      status: bundle.room.status,
      createdAt: bundle.room.createdAt.toISOString(),
    },
    members: bundle.members.map((member) => ({
      rentalId: member.rentalId,
      sessionId: member.sessionId,
      agentName: member.agentName,
      agentSlug: member.agentSlug,
      active: rentalIsActive({
        status: member.rentalStatus,
        startsAt: member.rentalStartsAt,
        endsAt: member.rentalEndsAt,
      }),
    })),
    messages: bundle.messages.map((row) => ({
      ...serializeRoomMessage(row),
      runStatus: row.runId ? (runById.get(row.runId)?.status ?? null) : null,
    })),
  });
}
