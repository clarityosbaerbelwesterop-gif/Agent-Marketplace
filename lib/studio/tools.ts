import { CONNECTOR_LIST } from "@/lib/connectors/registry";
import { connectorToolsForGrants } from "@/lib/connectors/tools";
import type { PublicConnectorGrant } from "@/lib/connectors/types";
import { STUDIO_CAPABILITY_LABELS } from "./graph";
import type { StudioCapabilityId, StudioToolsSnapshot } from "./types";

function isStudioCapability(value: string): value is StudioCapabilityId {
  return value in STUDIO_CAPABILITY_LABELS;
}

/**
 * Inventory for the Tools node. Uses the first-party registry and runtime
 * grant tools without invoking them or returning credentials.
 */
export function studioToolsSnapshot(
  grants: PublicConnectorGrant[] = [],
): StudioToolsSnapshot {
  const counts = new Map<StudioCapabilityId, number>();
  for (const definition of CONNECTOR_LIST) {
    for (const tag of definition.capabilityTags) {
      if (!isStudioCapability(tag)) {
        continue;
      }
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const capabilities = [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: STUDIO_CAPABILITY_LABELS[id],
      count,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  const activeGrantTools = connectorToolsForGrants(grants).length;

  return {
    registered: CONNECTOR_LIST.length,
    capabilities,
    activeGrantTools,
    notice:
      activeGrantTools > 0
        ? "Active grants expose status/invoke tools. This canvas lists them; it does not execute provider writes."
        : "No active grants on this pass. Inventory is registry capabilities only — nothing was invoked.",
  };
}
