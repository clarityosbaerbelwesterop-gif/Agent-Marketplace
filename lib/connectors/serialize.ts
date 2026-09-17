import { CONNECTOR_LIST, oauthEnvConfigured } from "./registry";
import type { ConnectorCatalogItem, PublicConnectorGrant } from "./types";

export function connectorCatalog(
  grants: PublicConnectorGrant[] = [],
): ConnectorCatalogItem[] {
  return CONNECTOR_LIST.map((definition) => {
    const grant =
      grants.find((row) => row.provider === definition.id) ?? null;
    return {
      ...definition,
      oauthConfigured: oauthEnvConfigured(definition),
      grant,
    };
  });
}
