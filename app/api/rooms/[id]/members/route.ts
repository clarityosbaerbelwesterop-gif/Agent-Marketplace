import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import { addRoomMember } from "@/lib/runtime/agent-rooms";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
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
  const rentalId = String((body as { rentalId?: unknown }).rentalId ?? "");
  const result = await addRoomMember({
    userId: auth.userId,
    roomId: id,
    rentalId,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return Response.json({ ok: true });
}
