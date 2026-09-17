import { NextResponse } from "next/server";
import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import { listMemories, writeMemory } from "@/lib/runtime/memory";
import { ensurePersonalWorkspace } from "@/lib/runtime/rentals";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const url = new URL(request.url);
  const workspaceId =
    url.searchParams.get("workspaceId")?.trim() ||
    (await ensurePersonalWorkspace(auth.userId)).id;
  const items = await listMemories(auth.userId, workspaceId);
  return NextResponse.json({
    workspaceId,
    items: items.map((row) => ({
      id: row.id,
      kind: row.kind,
      content: row.content,
      sessionId: row.sessionId,
      createdAt: row.createdAt.toISOString(),
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
  const payload = body as {
    workspaceId?: unknown;
    sessionId?: unknown;
    kind?: unknown;
    content?: unknown;
  };
  const workspaceId =
    typeof payload.workspaceId === "string" && payload.workspaceId.trim()
      ? payload.workspaceId.trim()
      : (await ensurePersonalWorkspace(auth.userId)).id;
  const kindRaw = String(payload.kind ?? "note");
  const kind =
    kindRaw === "transcript" || kindRaw === "fact" || kindRaw === "preference"
      ? kindRaw
      : "note";
  const result = await writeMemory({
    userId: auth.userId,
    workspaceId,
    sessionId: typeof payload.sessionId === "string" ? payload.sessionId : null,
    kind,
    content: String(payload.content ?? ""),
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json(result.data, { status: 201 });
}
