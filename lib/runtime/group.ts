import { loadRuntimeContext } from "./context";
import { executeTurn } from "./execute";
import { getSessionForUser, listGroupMembers } from "./rooms";
import type { RuntimeEvent } from "./types";

export async function executeGroupTurn(input: {
  userId: string;
  sessionId: string;
  message: string;
  emit: (event: RuntimeEvent) => Promise<void> | void;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const session = await getSessionForUser(input.userId, input.sessionId);
  if (!session) {
    return { ok: false, error: "Session not found", status: 404 };
  }
  if (session.status === "closed") {
    return { ok: false, error: "Session is closed", status: 409 };
  }
  if (session.kind !== "group") {
    return { ok: false, error: "Session is not a group room", status: 400 };
  }

  const members = await listGroupMembers(input.userId, session.id);
  const active = members.filter((member) => member.active);
  if (active.length === 0) {
    return {
      ok: false,
      error: "No active paid rentals remain in this group session.",
      status: 409,
    };
  }

  for (const member of active) {
    const context = await loadRuntimeContext({
      userId: input.userId,
      rentalId: member.rentalId,
      sessionId: session.id,
      existingSession: session,
    });
    if (!context.ok) {
      await input.emit({
        type: "error",
        message: `${member.agentName}: ${context.error}`,
        code: "member_unavailable",
      });
      continue;
    }
    await executeTurn(context.data, input.message, input.emit);
  }
  return { ok: true };
}
