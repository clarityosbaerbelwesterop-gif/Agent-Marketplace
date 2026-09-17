import { NextResponse } from "next/server";
import { CONNECTOR_LIST, connectorCatalog } from "@/lib/connectors";

export const dynamic = "force-dynamic";

/** Public first-wave connector catalog. OAuth is not implied. */
export async function GET() {
  return NextResponse.json({
    oauth: "not_wired_by_default",
    items: connectorCatalog().map((item) => ({
      id: item.id,
      name: item.displayName,
      description: item.description,
      authKind: item.authKind,
      requiredScopes: item.requiredScopes,
      capabilityTags: item.capabilityTags,
      oauthConfigured: item.oauthConfigured,
    })),
    ids: CONNECTOR_LIST.map((row) => row.id),
  });
}
