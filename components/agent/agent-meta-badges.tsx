import { AgentMark } from "@/components/agent/agent-mark";
import { Badge } from "@/components/ui/badge";
import {
  AGENT_TYPE_LABELS,
  AVAILABILITY_LABELS,
  CATEGORY_LABELS,
  FAMILY_LABELS,
  TIER_LABELS,
} from "@/lib/labels";
import { agentTypeForCategory } from "@/lib/catalog/agent-types";
import {
  agentInitials,
  agentPalette,
  isUntested,
} from "@/lib/ui/agent-presentation";
import type { AgentListItem } from "@/lib/catalog/types";

export function AgentMetaBadges({ agent }: { agent: AgentListItem }) {
  const agentType =
    agent.categoryGroup ?? agentTypeForCategory(agent.category);
  const category =
    CATEGORY_LABELS[agent.category as keyof typeof CATEGORY_LABELS] ?? agent.category;

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Merkmale">
      {agentType ? (
        <li>
          <Badge tone="accent">{AGENT_TYPE_LABELS[agentType]}</Badge>
        </li>
      ) : null}
      <li>
        <Badge tone="outline">{category}</Badge>
      </li>
      {agent.family && agent.family !== agentType ? (
        <li>
          <Badge tone="outline">
            {FAMILY_LABELS[agent.family as keyof typeof FAMILY_LABELS] ?? agent.family}
          </Badge>
        </li>
      ) : null}
      <li>
        <Badge tone={agentType ? "muted" : "accent"}>{TIER_LABELS[agent.tier]}</Badge>
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
