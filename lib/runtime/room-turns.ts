import { executeTurn, loadRuntimeContext } from "@/lib/runtime";
import {
  getRoomForUser,
  insertRoomMessage,
  patchRoomMessage,
  roomTurnPrompt,
} from "./agent-rooms";

/**
 * One coordinated round: each member agent replies once to the user message.
 * No agent-to-agent follow-up round (avoids infinite loops).
 */
export async function fanOutRoomTurn(input: {
  userId: string;
  roomId: string;
  userMessage: string;
}): Promise<void> {
  const bundle = await getRoomForUser(input.userId, input.roomId);
  if (!bundle || bundle.room.status !== "open") {
    return;
  }
  const names = bundle.members.map((member) => member.agentName);

  await Promise.all(
    bundle.members.map(async (member) => {
      const placeholder = await insertRoomMessage({
        userId: input.userId,
        roomId: input.roomId,
        authorKind: "agent",
        rentalId: member.rentalId,
        content: `${member.agentName} arbeitet…`,
        status: "working",
      });
      const context = await loadRuntimeContext({
        userId: input.userId,
        rentalId: member.rentalId,
        sessionId: member.sessionId ?? undefined,
      });
      if (!context.ok) {
        await patchRoomMessage(input.userId, placeholder.id, {
          status: "failed",
          content: context.error,
        });
        return;
      }
      context.data.extraInstructions = roomTurnPrompt({
        userMessage: input.userMessage,
        agentName: member.agentName,
        peerNames: names.filter((name) => name !== member.agentName),
      });
      let runId: string | null = null;
      let outputText = "";
      let failed: string | null = null;
      await executeTurn(context.data, input.userMessage, async (event) => {
        if (event.type === "meta") {
          runId = event.runId;
        }
        if (event.type === "done") {
          outputText = event.outputText;
        }
        if (event.type === "error") {
          failed = event.message;
        }
      });
      await patchRoomMessage(input.userId, placeholder.id, {
        runId,
        status: failed ? "failed" : "complete",
        content:
          failed ||
          outputText ||
          `${member.agentName} hat nichts geantwortet.`,
      });
    }),
  );
}
