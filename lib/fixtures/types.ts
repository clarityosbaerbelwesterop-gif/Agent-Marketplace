import type { AgentPalette } from "@/types/agent";

export const FIXTURE_TIERS = [
  "standard",
  "advanced",
  "expert",
  "elite",
  "frontier",
] as const;

export type FixtureTier = (typeof FIXTURE_TIERS)[number];

export const FIXTURE_CATEGORIES = [
  "legal",
  "research",
  "engineering",
  "support",
  "finance",
  "compliance",
  "marketing",
  "operations",
] as const;

export type FixtureCategory = (typeof FIXTURE_CATEGORIES)[number];

export const FIXTURE_LANGUAGES = ["de", "en", "de-en"] as const;

export type FixtureLanguage = (typeof FIXTURE_LANGUAGES)[number];

export const FIXTURE_DURATIONS = ["hour", "day", "week", "month"] as const;

export type FixtureDuration = (typeof FIXTURE_DURATIONS)[number];

export const FIXTURE_CONNECTORS = [
  "web-search",
  "files",
  "email",
  "calendar",
  "github",
  "slack",
  "crm",
  "database-readonly",
] as const;

export type FixtureConnector = (typeof FIXTURE_CONNECTORS)[number];

export type FixtureMoney = {
  amountCents: number;
  currency: "EUR";
};

export type FixtureAgent = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: FixtureCategory;
  tier: FixtureTier;
  languages: FixtureLanguage[];
  identity: { initials: string; palette: AgentPalette };
  specializations: string[];
  skills: Array<{ name: string; summary: string }>;
  connectors: FixtureConnector[];
  permissions: string[];
  availability: "available" | "limited" | "waitlist";
  untested: boolean;
  pricing: Record<FixtureDuration, FixtureMoney>;
  includedUsage: Record<FixtureDuration, string>;
};
