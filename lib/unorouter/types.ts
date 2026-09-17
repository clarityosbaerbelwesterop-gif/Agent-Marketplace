import type { AgentTier } from "@/lib/catalog/constants";

export const MODEL_ALIASES = [
  "standard",
  "advanced",
  "expert",
  "elite",
  "frontier",
] as const;

export type ModelAlias = (typeof MODEL_ALIASES)[number];

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ChatToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type ChatMessage = {
  role: ChatRole;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ChatToolCall[];
};

export type ChatTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number | null;
};

export type ModelCapabilities = {
  id: string;
  streaming: boolean;
  tools: boolean | "unknown";
  temperature: boolean | "unknown";
  /** USD per 1M prompt tokens; 0 for `:free`. Null when unknown. */
  inputUsdPerMillion: number | null;
  outputUsdPerMillion: number | null;
  source: "docs" | "models.dev" | "live" | "env";
};

export type AliasResolution = {
  alias: ModelAlias;
  modelId: string;
  fallbacks: string[];
  source: "env" | "catalog-snapshot";
  documented: boolean;
};

export type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  tools?: ChatTool[];
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
};

export type StreamChunk =
  | { type: "text"; text: string }
  | { type: "tool_calls"; toolCalls: ChatToolCall[] }
  | { type: "usage"; usage: ChatUsage }
  | { type: "finish"; reason: string };

export type ChatResult = {
  message: ChatMessage;
  usage: ChatUsage | null;
  finishReason: string | null;
  modelId: string;
};

export type AliasInput = ModelAlias | AgentTier | string | null | undefined;
