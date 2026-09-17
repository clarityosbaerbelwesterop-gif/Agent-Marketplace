import { AGENT_CATEGORIES, type AgentCategory } from "./constants";

export const AGENT_FAMILIES = [
  "coding",
  "marketing",
  "design",
  "sales",
] as const;

export type AgentFamily = (typeof AGENT_FAMILIES)[number];

export const AGENT_FAMILY_SET = new Set<string>(AGENT_FAMILIES);

/**
 * Map catalog `category` values onto marketplace families.
 * Used as a filter alias and for SQL backfill — not a 10k reseed.
 */
export const FAMILY_CATEGORIES: Record<AgentFamily, readonly AgentCategory[]> = {
  coding: [
    "software",
    "frontend",
    "backend",
    "databases",
    "devops",
    "QA",
    "security",
    "data analysis",
  ],
  marketing: ["marketing", "writing", "research"],
  design: ["design"],
  sales: ["sales", "project management"],
};

const CATEGORY_TO_FAMILY = new Map<string, AgentFamily>();
for (const family of AGENT_FAMILIES) {
  for (const category of FAMILY_CATEGORIES[family]) {
    CATEGORY_TO_FAMILY.set(category, family);
  }
}

export function familyFromCategory(
  category: string | null | undefined,
): AgentFamily | null {
  if (!category) {
    return null;
  }
  return CATEGORY_TO_FAMILY.get(category) ?? null;
}

export function categoriesForFamily(family: AgentFamily): readonly AgentCategory[] {
  return FAMILY_CATEGORIES[family];
}

export function isAgentFamily(value: string): value is AgentFamily {
  return AGENT_FAMILY_SET.has(value);
}

/** Unknown leftover categories stay unmapped rather than invented. */
export function assertFamilyCoversKnownCategories(): void {
  for (const category of AGENT_CATEGORIES) {
    if (!CATEGORY_TO_FAMILY.has(category)) {
      throw new Error(`Category "${category}" has no family mapping`);
    }
  }
}
