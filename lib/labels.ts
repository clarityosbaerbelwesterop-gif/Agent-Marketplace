import type { AgentAvailability, AgentRatingStatus, AgentTier } from "@/lib/catalog/enums";
import type { AgentCategory } from "@/lib/catalog/constants";
import type { AgentCategoryGroup } from "@/lib/catalog/groups";
import { AGENT_TYPE_LABELS } from "@/lib/catalog/agent-types";

export { AGENT_TYPE_LABELS };

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
  software: "Software",
  frontend: "Frontend",
  backend: "Backend",
  databases: "Datenbanken",
  devops: "DevOps",
  QA: "QA",
  security: "Security",
  "data analysis": "Datenanalyse",
  research: "Research",
  writing: "Writing",
  design: "Design",
  marketing: "Marketing",
  sales: "Sales",
  "project management": "Projektmanagement",
};

export const TIER_LABELS: Record<AgentTier, string> = {
  standard: "Standard",
  advanced: "Advanced",
  expert: "Expert",
  elite: "Elite",
  frontier: "Frontier",
};

export const AVAILABILITY_LABELS: Record<AgentAvailability, string> = {
  available: "Verfügbar",
  waitlist: "Warteliste",
  unavailable: "Nicht verfügbar",
};

export const RATING_LABELS: Record<AgentRatingStatus, string> = {
  untested: "Ungeprüft",
  baselined: "Baselined",
  verified: "Verifiziert",
};

export const FAMILY_LABELS: Record<
  "coding" | "marketing" | "design" | "sales",
  string
> = {
  coding: "Coding",
  marketing: "Marketing",
  design: "Design",
  sales: "Sales",
};

export const SORT_LABELS = {
  newest: "Neueste",
  name: "Name A–Z",
  tier: "Stufe",
  updated: "Aktualisiert",
} as const;

export const GROUP_LABELS: Record<AgentCategoryGroup, string> = {
  coding: "Coding",
  marketing: "Marketing",
  design: "Design",
  sales: "Sales",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as AgentCategory] ?? category;
}

/** German UI names for first-party connectors whose registry ids are vendor brands. */
const CONNECTOR_UI_NAMES: Record<string, string> = {
  neon: "Datenbank",
  vercel: "Hosting",
  stripe: "Mandanten-Zahlung",
};

const CONNECTOR_UI_DESCRIPTIONS: Record<string, string> = {
  neon: "Postgres-Datenbank und zugehörige APIs für diesen Miet-Workspace.",
  vercel: "Deployments und Projekte für diese Miete.",
  stripe:
    "Mandanten-Zahlungs-API für den gemieteten Agenten — nicht der Marktplatz-Checkout.",
};

export function connectorUiName(id: string, fallback: string): string {
  return CONNECTOR_UI_NAMES[id] ?? fallback;
}

export function connectorUiDescription(id: string, fallback: string): string {
  return CONNECTOR_UI_DESCRIPTIONS[id] ?? fallback;
}
