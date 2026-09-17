import { NextResponse } from "next/server";
import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import { listConnectorGrants, requestConnectorGrant } from "@/lib/runtime/connectors";
import { loadRuntimeContext } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const url = new URL(request.url);
  const rentalId = url.searchParams.get("rentalId")?.trim();
  const sessionId = url.searchParams.get("sessionId")?.trim();
  const context = await loadRuntimeContext({
    userId: auth.userId,
    rentalId: rentalId || undefined,
    sessionId: sessionId || undefined,
  });
  if (!context.ok) {
    return jsonError(context.error, context.status);
  }
  const items = await listConnectorGrants(
    auth.userId,
    context.data.rental.workspaceId,
  );
  return NextResponse.json({ items, oauth: "not_wired" });
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
    rentalId?: unknown;
    sessionId?: unknown;
    provider?: unknown;
    scopes?: unknown;
    stubGrant?: unknown;
  };
  const context = await loadRuntimeContext({
    userId: auth.userId,
    rentalId: typeof payload.rentalId === "string" ? payload.rentalId : undefined,
    sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
  });
  if (!context.ok) {
    return jsonError(context.error, context.status);
  }
  const result = await requestConnectorGrant({
    userId: auth.userId,
    workspaceId: context.data.rental.workspaceId,
    provider: String(payload.provider ?? ""),
    scopes: Array.isArray(payload.scopes)
      ? payload.scopes.map((scope) => String(scope))
      : [],
    stubGrant: payload.stubGrant === true,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json(result.data, { status: 201 });
}
