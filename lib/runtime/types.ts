import type { AgentTier } from "@/lib/catalog/constants";
import type { AgentSkill, AgentProfile, AgentRun, AgentSession, Rental } from "@/lib/db";
import type { PublicConnectorGrant } from "@/lib/connectors";
import type { ChatMessage, ChatUsage, ModelAlias } from "@/lib/unorouter/types";

export type RuntimeContext = {
  userId: string;
  rental: Rental;
  session: AgentSession;
  agent: AgentProfile;
  skill: AgentSkill | null;
  alias: ModelAlias;
  modelIds: string[];
  memories: Array<{ id: string; kind: string; content: string; createdAt: string }>;
  history: ChatMessage[];
  connectorGrants: PublicConnectorGrant[];
};

export type RuntimeEvent =
  | {
      type: "meta";
      runId: string;
      sessionId: string;
      rentalId: string;
      modelId: string;
      skillVersion: string | null;
      alias: ModelAlias;
    }
  | { type: "delta"; text: string }
  | { type: "tool"; name: string; status: "start" | "done" | "error"; detail?: string }
  | { type: "status"; status: AgentRun["status"] }
  | { type: "done"; usage: ChatUsage | null; outputText: string; modelIdUsed: string }
  | { type: "error"; message: string; code: string };

export type ExecuteTurnInput = {
  userId: string;
  rentalId?: string;
  sessionId?: string;
  message: string;
  background?: boolean;
};

export type TierRuntimePolicy = {
  alias: ModelAlias;
  maxToolRounds: number;
  providerRetries: number;
  checkResults: boolean;
  retryOnCheckFailure: boolean;
  planning: "brief" | "structured" | "strong";
};

export const TIER_RUNTIME_POLICY: Record<AgentTier, TierRuntimePolicy> = {
  standard: {
    alias: "standard",
    maxToolRounds: 2,
    providerRetries: 1,
    checkResults: false,
    retryOnCheckFailure: false,
    planning: "brief",
  },
  advanced: {
    alias: "advanced",
    maxToolRounds: 4,
    providerRetries: 1,
    checkResults: false,
    retryOnCheckFailure: false,
    planning: "structured",
  },
  expert: {
    alias: "expert",
    maxToolRounds: 6,
    providerRetries: 2,
    checkResults: true,
    retryOnCheckFailure: false,
    planning: "structured",
  },
  elite: {
    alias: "elite",
    maxToolRounds: 8,
    providerRetries: 2,
    checkResults: true,
    retryOnCheckFailure: true,
    planning: "strong",
  },
  frontier: {
    alias: "frontier",
    maxToolRounds: 12,
    providerRetries: 3,
    checkResults: true,
    retryOnCheckFailure: true,
    planning: "strong",
  },
};

export type JsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };
