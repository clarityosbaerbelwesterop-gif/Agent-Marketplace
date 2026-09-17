/**
 * JSONB payload shapes for catalog and runtime tables.
 * These are structural contracts, not a seeded catalog.
 */

export type JsonObject = Record<string, unknown>;

export type AgentModelConfig = {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  extra?: JsonObject;
};

export type AgentConnectorSpec = {
  provider: string;
  required?: boolean;
  scopes?: string[];
};

export type AgentPermissions = {
  tools?: string[];
  network?: "none" | "limited" | "full";
  files?: "none" | "read" | "readwrite";
};

export type AgentRentalDuration = {
  id: string;
  label: string;
  durationHours: number;
  priceCents: number;
  currency: string;
  usageIncluded: number;
};

export type AgentRentalOptions = {
  durations: AgentRentalDuration[];
  usageUnit?: "tokens" | "requests" | "minutes";
};

export type SkillJsonSchema = JsonObject;

export type SkillToolRequirements = {
  tools?: string[];
  connectors?: string[];
};

export type SkillCheckCriteria = {
  checks?: Array<{ id: string; description: string }>;
};
