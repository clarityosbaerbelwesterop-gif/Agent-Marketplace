import { NextResponse } from "next/server";
import {
  CONNECTOR_LIST,
  FIRST_WAVE_CONNECTOR_IDS,
  connectorCatalog,
  isFirstWaveConnectorId,
} from "@/lib/connectors";

export const dynamic = "force-dynamic";

/** Public first-party connector catalog. OAuth is not implied. Discovery stays grantable:false. */
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
      grantable: true as const,
      wave: isFirstWaveConnectorId(item.id) ? ("first" as const) : ("stub" as const),
    })),
    ids: CONNECTOR_LIST.map((row) => row.id),
    firstWaveIds: [...FIRST_WAVE_CONNECTOR_IDS],
  });
}
