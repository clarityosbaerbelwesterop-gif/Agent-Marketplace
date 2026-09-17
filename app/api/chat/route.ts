import { after } from "next/server";
import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import { isUnorouterConfigured } from "@/lib/unorouter";
import { isFreellmConfigured } from "@/lib/freellm";
import { modelRoutingUnavailableMessage } from "@/lib/llm";
import {
  createSseStream,
  executeGroupTurn,
  executeTurn,
  getSessionForUser,
  loadRuntimeContext,
  sseHeaders,
} from "@/lib/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  const payload = body as {
    rentalId?: unknown;
    sessionId?: unknown;
    message?: unknown;
    background?: unknown;
  };
  const message = String(payload.message ?? "").trim();
  if (!message) {
    return jsonError("message is required", 400);
  }

  if (!isUnorouterConfigured() && !isFreellmConfigured()) {
    return jsonError(modelRoutingUnavailableMessage(), 503);
  }

  const sessionId =
    typeof payload.sessionId === "string" ? payload.sessionId : undefined;
  if (sessionId) {
    const session = await getSessionForUser(auth.userId, sessionId);
    if (session?.kind === "group") {
      const background = payload.background === true;
      if (background) {
        const work = executeGroupTurn({
          userId: auth.userId,
          sessionId,
          message,
          emit: async () => undefined,
        });
        after(() => work);
        return Response.json({
          background: true,
          sessionId,
          kind: "group",
          status: "queued",
        });
      }
      const { stream, done } = createSseStream(async (emit) => {
        const result = await executeGroupTurn({
          userId: auth.userId,
          sessionId,
          message,
          emit,
        });
        if (!result.ok) {
          await emit({ type: "error", message: result.error, code: "group_chat" });
        }
      });
      after(() => done);
      return new Response(stream, { headers: sseHeaders() });
    }
  }

  const context = await loadRuntimeContext({
    userId: auth.userId,
    rentalId: typeof payload.rentalId === "string" ? payload.rentalId : undefined,
    sessionId,
  });
  if (!context.ok) {
    return jsonError(context.error, context.status);
  }

  if (context.data.route.length === 0) {
    return jsonError(modelRoutingUnavailableMessage(), 503);
  }

  const background = payload.background === true;
  if (background) {
    const captured: { runId?: string; sessionId?: string; modelId?: string } = {};
    const work = executeTurn(context.data, message, async (event) => {
      if (event.type === "meta") {
        captured.runId = event.runId;
        captured.sessionId = event.sessionId;
        captured.modelId = event.modelId;
      }
    });
    after(() => work);
    await Promise.race([
      work.then(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 50)),
    ]);
    return Response.json({
      background: true,
      runId: captured.runId ?? null,
      sessionId: context.data.session.id,
      rentalId: context.data.rental.id,
      status: "queued",
    });
  }

  const { stream, done } = createSseStream((emit) =>
    executeTurn(context.data, message, emit),
  );
  after(() => done);
  return new Response(stream, { headers: sseHeaders() });
}
