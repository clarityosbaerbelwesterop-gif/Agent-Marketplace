import { jsonError, requireApiUser } from "@/lib/api/guard";
import { removeRoomMember } from "@/lib/runtime/agent-rooms";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; rentalId: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const { id, rentalId } = await context.params;
  const result = await removeRoomMember({
    userId: auth.userId,
    roomId: id,
    rentalId,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return Response.json({ ok: true });
}
