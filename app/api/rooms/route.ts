import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import { createRoom, listRooms } from "@/lib/runtime/agent-rooms";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const rooms = await listRooms(auth.userId);
  return Response.json({
    items: rooms.map((room) => ({
      id: room.id,
      workspaceId: room.workspaceId,
      title: room.title,
      status: room.status,
      createdAt: room.createdAt.toISOString(),
    })),
  });
}

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
  const payload = body as { title?: unknown; rentalIds?: unknown };
  const rentalIds = Array.isArray(payload.rentalIds)
    ? payload.rentalIds.map((id) => String(id))
    : [];
  const result = await createRoom({
    userId: auth.userId,
    title: String(payload.title ?? ""),
    rentalIds,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return Response.json(
    {
      id: result.data.id,
      workspaceId: result.data.workspaceId,
      title: result.data.title,
      status: result.data.status,
    },
    { status: 201 },
  );
}
