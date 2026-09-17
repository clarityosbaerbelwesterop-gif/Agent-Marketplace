export type AgentSlug = string;

export type {
  AgentAvailability,
  AgentDetail,
  AgentListItem,
  AgentListResponse,
  AgentRatingStatus,
  AgentTier,
} from "@/lib/catalog/types";

export { AGENT_CATEGORIES, AGENT_TIERS } from "@/lib/catalog/constants";

export const AGENT_PALETTES = [
  "ink",
  "forest",
  "ochre",
  "slate",
  "clay",
  "sea",
] as const;

export type AgentPalette = (typeof AGENT_PALETTES)[number];

export type Money = {
  amountCents: number;
  currency: string;
};
