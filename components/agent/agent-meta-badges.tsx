import { AgentMark } from "@/components/agent/agent-mark";
import { Badge } from "@/components/ui/badge";
import { AVAILABILITY_LABELS, TIER_LABELS } from "@/lib/labels";
import {
  agentInitials,
  agentPalette,
  isUntested,
} from "@/lib/ui/agent-presentation";
import type { AgentListItem } from "@/lib/catalog/types";

export function AgentMetaBadges({ agent }: { agent: AgentListItem }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Merkmale">
      <li>
        <Badge tone="outline">{agent.category}</Badge>
      </li>
      <li>
        <Badge tone="accent">{TIER_LABELS[agent.tier]}</Badge>
      </li>
      <li>
        <Badge>{AVAILABILITY_LABELS[agent.availability]}</Badge>
      </li>
      {isUntested(agent) ? (
        <li>
          <Badge tone="warning">Ungeprüft</Badge>
        </li>
      ) : null}
    </ul>
  );
}

export function AgentIdentityMark({
  agent,
  size = "md",
}: {
  agent: Pick<AgentListItem, "name" | "slug">;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <AgentMark
      initials={agentInitials(agent.name)}
      palette={agentPalette(agent.slug)}
      size={size}
    />
  );
}
