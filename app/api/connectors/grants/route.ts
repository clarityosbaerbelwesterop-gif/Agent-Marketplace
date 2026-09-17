import { NextResponse } from "next/server";
import { jsonError, readJsonBody, requireApiUser } from "@/lib/api/guard";
import {
  listConnectorGrants,
  requestConnectorGrant,
  resolveConnectorScope,
  revokeConnectorGrant,
} from "@/lib/connectors";

export const dynamic = "force-dynamic";

function scopeFromSearch(url: URL) {
  return {
    rentalId: url.searchParams.get("rentalId")?.trim() || undefined,
    sessionId: url.searchParams.get("sessionId")?.trim() || undefined,
    workspaceId: url.searchParams.get("workspaceId")?.trim() || undefined,
    provider: url.searchParams.get("provider")?.trim() || undefined,
  };
}

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const scopeParams = scopeFromSearch(new URL(request.url));
  const scope = await resolveConnectorScope({
    userId: auth.userId,
    ...scopeParams,
  });
  if (!scope.ok) {
    return jsonError(scope.error, scope.status);
  }
  const items = await listConnectorGrants(auth.userId, scope.data.workspaceId);
  return NextResponse.json({
    items,
    workspaceId: scope.data.workspaceId,
    rentalId: scope.data.rentalId,
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
    rentalId?: unknown;
    sessionId?: unknown;
    workspaceId?: unknown;
    provider?: unknown;
    scopes?: unknown;
    credentials?: unknown;
  };
  const scope = await resolveConnectorScope({
    userId: auth.userId,
    rentalId: typeof payload.rentalId === "string" ? payload.rentalId : undefined,
    sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
    workspaceId:
      typeof payload.workspaceId === "string" ? payload.workspaceId : undefined,
  });
  if (!scope.ok) {
    return jsonError(scope.error, scope.status);
  }
  const result = await requestConnectorGrant({
    userId: auth.userId,
    workspaceId: scope.data.workspaceId,
    rentalId: scope.data.rentalId,
    provider: String(payload.provider ?? ""),
    scopes: Array.isArray(payload.scopes)
      ? payload.scopes.map((scopeItem) => String(scopeItem))
      : [],
    credentials: payload.credentials,
    request,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json(result.data, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const url = new URL(request.url);
  const scopeParams = scopeFromSearch(url);
  let provider = scopeParams.provider;
  if (!provider) {
    const json = await readJsonBody(request);
    if (json.ok && json.body && typeof json.body === "object") {
      const payload = json.body as { provider?: unknown };
      provider = typeof payload.provider === "string" ? payload.provider : undefined;
    }
  }
  if (!provider) {
    return jsonError("provider is required", 400);
  }
  const scope = await resolveConnectorScope({
    userId: auth.userId,
    rentalId: scopeParams.rentalId,
    sessionId: scopeParams.sessionId,
    workspaceId: scopeParams.workspaceId,
  });
  if (!scope.ok) {
    return jsonError(scope.error, scope.status);
  }
  const result = await revokeConnectorGrant({
    userId: auth.userId,
    workspaceId: scope.data.workspaceId,
    provider,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json({ grant: result.data });
}
