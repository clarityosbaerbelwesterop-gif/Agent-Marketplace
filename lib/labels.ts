import type { AgentAvailability, AgentRatingStatus, AgentTier } from "@/lib/catalog/enums";
import type { AgentCategoryGroup } from "@/lib/catalog/groups";

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
