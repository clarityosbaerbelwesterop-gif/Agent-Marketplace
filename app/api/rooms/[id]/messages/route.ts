import { after } from "next/server";
import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import {
  capacityUnavailableMessage,
  isModelCapacityConfigured,
} from "@/lib/runtime/capacity";
import { getRoomForUser, insertRoomMessage, serializeRoomMessage } from "@/lib/runtime/agent-rooms";
import { fanOutRoomTurn } from "@/lib/runtime/room-turns";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  if (!isModelCapacityConfigured()) {
    return jsonError(capacityUnavailableMessage(), 503);
  }
  const { id } = await context.params;
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const body = json.body;
  if (!body || typeof body !== "object") {
    return jsonError("Invalid JSON", 400);
  }
  const message = String((body as { message?: unknown }).message ?? "").trim();
  if (!message) {
    return jsonError("message is required", 400);
  }
  const bundle = await getRoomForUser(auth.userId, id);
  if (!bundle) {
    return jsonError("Room not found", 404);
  }
  if (bundle.room.status !== "open") {
    return jsonError("Room is closed", 409);
  }
  if (bundle.members.length < 2) {
    return jsonError("A room needs at least two members", 400);
  }

  const userMessage = await insertRoomMessage({
    userId: auth.userId,
    roomId: id,
    authorKind: "user",
    content: message,
    status: "complete",
  });

  const work = fanOutRoomTurn({
    userId: auth.userId,
    roomId: id,
    userMessage: message,
  });
  after(() => work);

  return Response.json({
    message: serializeRoomMessage(userMessage),
    status: "working",
    members: bundle.members.length,
  });
}
