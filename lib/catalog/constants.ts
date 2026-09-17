export const AGENT_CATEGORIES = [
  "software",
  "frontend",
  "backend",
  "databases",
  "devops",
  "QA",
  "security",
  "data analysis",
  "research",
  "writing",
  "design",
  "marketing",
  "sales",
  "project management",
] as const;

export type AgentCategory = (typeof AGENT_CATEGORIES)[number];

export const AGENT_TIERS = [
  "standard",
  "advanced",
  "expert",
  "elite",
  "frontier",
] as const;

export type AgentTier = (typeof AGENT_TIERS)[number];

export const AGENT_SORTS = ["newest", "name", "tier", "updated"] as const;

export type AgentSort = (typeof AGENT_SORTS)[number];

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 50;
export const MIN_PAGE_SIZE = 1;

export const AGENT_CATEGORY_SET = new Set<string>(AGENT_CATEGORIES);
export const AGENT_TIER_SET = new Set<string>(AGENT_TIERS);
export const AGENT_SORT_SET = new Set<string>(AGENT_SORTS);
