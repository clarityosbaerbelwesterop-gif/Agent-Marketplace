export type AgentSlug = string;

export type { AgentDetail, AgentListItem } from "@/lib/catalog/types";

/**
 * Domain shape for a listable agent. Catalog rows live in `agent_profiles`.
 */
export type Agent = {
  slug: AgentSlug;
  name: string;
  description: string;
};
