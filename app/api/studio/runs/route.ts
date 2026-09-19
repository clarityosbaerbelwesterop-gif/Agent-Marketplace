import { after } from "next/server";
import { jsonError, readJsonBody } from "@/lib/api/guard";
import { createSseStream, sseHeaders } from "@/lib/runtime";
import { runStudioGraph } from "@/lib/studio/pipeline";
import type { StudioEvent } from "@/lib/studio/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const json = await readJsonBody(request);
  if (!json.ok) {
    return json.response;
  }
  const body = json.body;
  if (!body || typeof body !== "object") {
    return jsonError("Invalid JSON", 400);
  }
  const payload = body as { brief?: unknown };
  const brief = String(payload.brief ?? "").trim();
  if (!brief) {
    return jsonError("brief is required", 400);
  }

  const { stream, done } = createSseStream<StudioEvent>(async (emit) => {
    await runStudioGraph({ brief, emit });
  });
  after(() => done);
  return new Response(stream, { headers: sseHeaders() });
}
