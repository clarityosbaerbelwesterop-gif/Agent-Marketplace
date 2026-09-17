import { after } from "next/server";
import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import { isUnorouterConfigured } from "@/lib/unorouter";
import { UNOROUTER_TOKEN_URL } from "@/lib/unorouter/config";
import {
  createSseStream,
  executeTurn,
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

  const context = await loadRuntimeContext({
    userId: auth.userId,
    rentalId: typeof payload.rentalId === "string" ? payload.rentalId : undefined,
    sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
  });
  if (!context.ok) {
    return jsonError(context.error, context.status);
  }

  if (!isUnorouterConfigured()) {
    return jsonError(
      `UNOROUTER_API_KEY is not set. Create a key at ${UNOROUTER_TOKEN_URL} and set UNOROUTER_API_KEY.`,
      503,
    );
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
    // Give meta a tick so the client can poll.
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
