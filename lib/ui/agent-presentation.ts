import type { AgentListItem } from "@/lib/catalog/types";
import type { AgentRentalDuration } from "@/lib/db/json";
import type { AgentPalette } from "@/types/agent";
import { AGENT_PALETTES } from "@/types/agent";

export function agentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "AG";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function agentPalette(slug: string): AgentPalette {
  let sum = 0;
  for (let index = 0; index < slug.length; index += 1) {
    sum += slug.charCodeAt(index);
  }
  return AGENT_PALETTES[sum % AGENT_PALETTES.length] ?? "ink";
}

export function isUntested(agent: Pick<AgentListItem, "ratingStatus">): boolean {
  return agent.ratingStatus === "untested";
}

export function listDurations(agent: Pick<AgentListItem, "rentalOptions">): AgentRentalDuration[] {
  return agent.rentalOptions?.durations ?? [];
}

export function pickDuration(
  agent: Pick<AgentListItem, "rentalOptions">,
  durationId?: string | null,
): AgentRentalDuration | undefined {
  const durations = listDurations(agent);
  if (durationId) {
    return durations.find((item) => item.id === durationId) ?? durations[0];
  }
  return (
    durations.find((item) => item.durationHours === 24) ??
    durations.find((item) => item.durationHours === 1) ??
    durations[0]
  );
}

export function formatUsage(agent: Pick<AgentListItem, "rentalOptions">, duration: AgentRentalDuration): string {
  const unit = agent.rentalOptions?.usageUnit ?? "tokens";
  return `${duration.usageIncluded.toLocaleString("de-DE")} ${unit} inklusive`;
}
