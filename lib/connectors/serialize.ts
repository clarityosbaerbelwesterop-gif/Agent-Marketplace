import { CONNECTOR_LIST, oauthEnvConfigured } from "./registry";
import { canonicalConnectorId } from "./aliases";
import type { ConnectorCatalogItem, PublicConnectorGrant } from "./types";
import type { AgentConnectorSpec } from "@/lib/db/json";

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

export function mergeAgentAndSupportedConnectors(
  agentConnectors: AgentConnectorSpec[],
): AgentConnectorSpec[] {
  const byProvider = new Map<string, AgentConnectorSpec>();
  for (const definition of CONNECTOR_LIST) {
    byProvider.set(definition.id, {
      provider: definition.id,
      required: false,
      scopes: [...definition.requiredScopes],
    });
  }
  for (const spec of agentConnectors) {
    const provider = canonicalConnectorId(spec.provider);
    if (!provider) {
      continue;
    }
    const existing = byProvider.get(provider);
    byProvider.set(provider, {
      provider,
      required: spec.required ?? existing?.required ?? false,
      scopes:
        spec.scopes && spec.scopes.length > 0
          ? spec.scopes
          : (existing?.scopes ?? []),
    });
  }
  return CONNECTOR_LIST.map((definition) => byProvider.get(definition.id)!);
}
