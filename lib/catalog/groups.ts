import { AGENT_CATEGORIES, type AgentCategory } from "./constants";

/**
 * First-class marketplace groups. Catalog rows keep their existing
 * `category` values (software, frontend, …). These groups map those
 * specializations for filters — they do not invent benchmarks.
 */
export const AGENT_CATEGORY_GROUPS = [
  "coding",
  "marketing",
  "design",
  "sales",
] as const;

export type AgentCategoryGroup = (typeof AGENT_CATEGORY_GROUPS)[number];

export const AGENT_CATEGORY_GROUP_SET = new Set<string>(AGENT_CATEGORY_GROUPS);

export const AGENT_CATEGORY_GROUP_LABELS: Record<AgentCategoryGroup, string> = {
  coding: "Coding",
  marketing: "Marketing",
  design: "Design",
  sales: "Sales",
};

/** Existing catalog categories that belong to each first-class group. */
export const CATEGORY_GROUP_MEMBERS: Record<
  AgentCategoryGroup,
  readonly AgentCategory[]
> = {
  coding: [
    "software",
    "frontend",
    "backend",
    "databases",
    "devops",
    "QA",
    "security",
  ],
  marketing: ["marketing"],
  design: ["design"],
  sales: ["sales"],
};

const CATEGORY_TO_GROUP = new Map<string, AgentCategoryGroup>();
for (const group of AGENT_CATEGORY_GROUPS) {
  for (const category of CATEGORY_GROUP_MEMBERS[group]) {
    CATEGORY_TO_GROUP.set(category, group);
  }
}

export function isAgentCategoryGroup(value: string): value is AgentCategoryGroup {
  return AGENT_CATEGORY_GROUP_SET.has(value);
}

export function categoryGroupFor(category: string): AgentCategoryGroup | null {
  return CATEGORY_TO_GROUP.get(category) ?? null;
}

export function categoriesForGroup(group: AgentCategoryGroup): readonly string[] {
  return CATEGORY_GROUP_MEMBERS[group];
}

export function allGroupedCategories(): readonly string[] {
  return AGENT_CATEGORY_GROUPS.flatMap((group) => [...CATEGORY_GROUP_MEMBERS[group]]);
}

/** Categories that are not in the four first-class groups (still filterable). */
export function ungroupedCatalogCategories(): readonly AgentCategory[] {
  const grouped = new Set(allGroupedCategories());
  return AGENT_CATEGORIES.filter((category) => !grouped.has(category));
}
