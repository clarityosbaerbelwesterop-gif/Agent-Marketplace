/**
 * Runtime-facing connector helpers.
 *
 * Grant CRUD lives in `lib/connectors/`. This module keeps the agent-spec
 * merge used when a catalog row lists extra providers.
 */
import type { AgentConnectorSpec } from "@/lib/db/json";
import { canonicalConnectorId, type PublicConnectorGrant } from "@/lib/connectors";

export {
  listConnectorGrants,
  requestConnectorGrant,
  revokeConnectorGrant,
} from "@/lib/connectors";

export function mergeConnectorStatus(
  specs: AgentConnectorSpec[],
  grants: PublicConnectorGrant[],
) {
  return specs.map((spec) => {
    const canonical = canonicalConnectorId(spec.provider) ?? spec.provider;
    const grant = grants.find(
      (row) => row.provider === spec.provider || row.provider === canonical,
    );
    return {
      provider: spec.provider,
      required: Boolean(spec.required),
      requestedScopes: spec.scopes ?? [],
      grant: grant
        ? {
            id: grant.id,
            status: grant.status,
            scopes: grant.scopes,
            hasCredentials: grant.hasCredentials,
          }
        : null,
    };
  });
}
