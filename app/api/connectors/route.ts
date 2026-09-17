import { NextResponse } from "next/server";
import { jsonError, requireApiUser } from "@/lib/api/guard";
import { connectorCatalog, listConnectorGrants, resolveConnectorScope } from "@/lib/connectors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const url = new URL(request.url);
  const rentalId = url.searchParams.get("rentalId")?.trim() || undefined;
  const sessionId = url.searchParams.get("sessionId")?.trim() || undefined;
  const workspaceId = url.searchParams.get("workspaceId")?.trim() || undefined;

  if (!rentalId && !sessionId && !workspaceId) {
    return NextResponse.json({
      items: connectorCatalog(),
      workspaceId: null,
      rentalId: null,
    });
  }

  const scope = await resolveConnectorScope({
    userId: auth.userId,
    rentalId,
    sessionId,
    workspaceId,
  });
  if (!scope.ok) {
    return jsonError(scope.error, scope.status);
  }
  const grants = await listConnectorGrants(auth.userId, scope.data.workspaceId);
  return NextResponse.json({
    items: connectorCatalog(grants),
    workspaceId: scope.data.workspaceId,
    rentalId: scope.data.rentalId,
  });
}
