import type {
  AgentConnectorSpec,
  AgentPermissions,
  AgentRentalOptions,
} from "@/lib/db/json";
import type { AgentAvailability, AgentRatingStatus, AgentTier } from "@/lib/catalog/enums";

export type { AgentAvailability, AgentRatingStatus, AgentTier };

export type AgentListItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  specializations: string[];
  languages: string[];
  tier: AgentTier;
  tagline: string | null;
  accentColor: string | null;
  modelAlias: string | null;
  skillPackageVersion: string | null;
  ratingStatus: AgentRatingStatus;
  availability: AgentAvailability;
  rentalOptions: AgentRentalOptions;
};

export type AgentSkillSummary = {
  id: string;
  slug: string;
  version: string;
  instructions: string;
  published: boolean;
};

export type AgentDetail = AgentListItem & {
  avatarUrl: string | null;
  bannerUrl: string | null;
  modelConfig: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
  };
  connectors: AgentConnectorSpec[];
  permissions: AgentPermissions;
  configVersion: number;
  createdAt: string;
  updatedAt: string;
  skills: AgentSkillSummary[];
};

export type AgentListResponse = {
  items: AgentListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort: string;
  filters: {
    search: string | null;
    category: string | null;
    tier: string | null;
  };
};

export type FavoriteListItem = AgentListItem & {
  favoritedAt: string;
};

/** Side-by-side catalog fields. No invented benchmarks or scores. */
export type AgentCompareSkillSummary = {
  slug: string;
  version: string;
  summary: string;
};

export type AgentCompareItem = {
  slug: string;
  name: string;
  category: string;
  tier: AgentTier;
  modelAlias: string | null;
  ratingStatus: AgentRatingStatus;
  rentalOptions: AgentRentalOptions;
  connectors: AgentConnectorSpec[];
  skills: AgentCompareSkillSummary[];
};

export type AgentCompareResponse = {
  items: AgentCompareItem[];
  missing: string[];
  requested: string[];
};
