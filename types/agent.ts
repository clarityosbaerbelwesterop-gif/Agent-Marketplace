export type AgentSlug = string;

/**
 * Domain shape for a listable agent. No catalog is seeded in this foundation.
 */
export type Agent = {
  slug: AgentSlug;
  name: string;
  description: string;
};
