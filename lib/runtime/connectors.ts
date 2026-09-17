/**
 * Runtime-facing connector helpers.
 *
 * Grant CRUD lives in `lib/connectors/`. This module keeps the agent-spec
 * merge used when a catalog row lists extra providers.
 */
export {
  listConnectorGrants,
  requestConnectorGrant,
  revokeConnectorGrant,
} from "@/lib/connectors";
import type { AgentConnectorSpec } from "@/lib/db/json";
import type { PublicConnectorGrant } from "@/lib/connectors";

export function mergeConnectorStatus(
  specs: AgentConnectorSpec[],
  grants: PublicConnectorGrant[],
) {
  return specs.map((spec) => {
    const grant = grants.find((row) => row.provider === spec.provider);
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
