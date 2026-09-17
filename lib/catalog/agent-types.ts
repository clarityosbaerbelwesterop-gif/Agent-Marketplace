import {
  AGENT_CATEGORY_GROUPS,
  AGENT_CATEGORY_GROUP_LABELS,
  categoryGroupFor,
  categoriesForGroup,
  isAgentCategoryGroup,
  type AgentCategoryGroup,
} from "./groups";

/**
 * Product-facing agent types. Same vocabulary as catalog `group`
 * (coding / marketing / design / sales). Catalog rows keep their original
 * `category` values — this overlay does not re-seed the 10k catalog.
 */
export const AGENT_TYPES = AGENT_CATEGORY_GROUPS;
export type AgentType = AgentCategoryGroup;
export const AGENT_TYPE_SET = new Set<string>(AGENT_TYPES);
export const AGENT_TYPE_LABELS = AGENT_CATEGORY_GROUP_LABELS;

export const AGENT_TYPE_BLURBS: Record<AgentType, string> = {
  coding: "Software, Frontend, Backend, Datenbanken, DevOps, QA, Security, Datenanalyse",
  marketing: "Marketing, Writing, Research",
  design: "Design — Atelier- und Portfolio-Profile",
  sales: "Sales und Projektmanagement",
};

export function isAgentType(value: string): value is AgentType {
  return isAgentCategoryGroup(value);
}

export function agentTypeForCategory(category: string): AgentType | null {
  return categoryGroupFor(category);
}

export function categoriesForAgentType(type: AgentType): readonly string[] {
  return categoriesForGroup(type);
}

export function isDesignCategory(category: string): boolean {
  return categoryGroupFor(category) === "design";
}
