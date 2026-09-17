import { UnorouterError } from "./errors";
import type { ModelCapabilities } from "./types";

/**
 * Capability + pricing snapshot for models we actually cite.
 *
 * Sources (2026-09-17):
 * - Official quickstart example: `gpt-oss-120b:free`
 *   https://unorouter.com/en/docs/platform/quickstart
 * - models.dev UnoRouter catalog (tool-capable IDs + prices)
 *   https://models.dev/providers/unorouter/
 *
 * Live catalog: GET {UNOROUTER_BASE_URL}/models with UNOROUTER_API_KEY.
 * Do not treat this snapshot as the full 200+ model list.
 */
export const CATALOG_SNAPSHOT: Record<string, ModelCapabilities> = {
  "gpt-oss-120b:free": {
    id: "gpt-oss-120b:free",
    streaming: true,
    tools: "unknown",
    temperature: "unknown",
    inputUsdPerMillion: 0,
    outputUsdPerMillion: 0,
    source: "docs",
  },
  "deepseek-v4-flash:free": {
    id: "deepseek-v4-flash:free",
    streaming: true,
    tools: true,
    temperature: true,
    inputUsdPerMillion: 0,
    outputUsdPerMillion: 0,
    source: "models.dev",
  },
  "gemma-4-31b-it:free": {
    id: "gemma-4-31b-it:free",
    streaming: true,
    tools: true,
    temperature: true,
    inputUsdPerMillion: 0,
    outputUsdPerMillion: 0,
    source: "models.dev",
  },
  "deepseek-v4-flash": {
    id: "deepseek-v4-flash",
    streaming: true,
    tools: true,
    temperature: true,
    inputUsdPerMillion: 0.06,
    outputUsdPerMillion: 0.13,
    source: "models.dev",
  },
  "gemini-3.5-flash": {
    id: "gemini-3.5-flash",
    streaming: true,
    tools: true,
    temperature: true,
    inputUsdPerMillion: 0.19,
    outputUsdPerMillion: 1.11,
    source: "models.dev",
  },
  "gpt-5.5": {
    id: "gpt-5.5",
    streaming: true,
    tools: true,
    temperature: false,
    inputUsdPerMillion: 0.19,
    outputUsdPerMillion: 1.13,
    source: "models.dev",
  },
  "gpt-5.2": {
    id: "gpt-5.2",
    streaming: true,
    tools: true,
    temperature: true,
    inputUsdPerMillion: 1.05,
    outputUsdPerMillion: 8.4,
    source: "models.dev",
  },
  "deepseek-v4-pro": {
    id: "deepseek-v4-pro",
    streaming: true,
    tools: true,
    temperature: true,
    inputUsdPerMillion: 0.9,
    outputUsdPerMillion: 1.8,
    source: "models.dev",
  },
  "glm-5.2": {
    id: "glm-5.2",
    streaming: true,
    tools: true,
    temperature: true,
    inputUsdPerMillion: 1.6,
    outputUsdPerMillion: 5.03,
    source: "models.dev",
  },
  "claude-sonnet-5": {
    id: "claude-sonnet-5",
    streaming: true,
    tools: true,
    temperature: false,
    inputUsdPerMillion: 1.44,
    outputUsdPerMillion: 7.2,
    source: "models.dev",
  },
  "kimi-k2.6": {
    id: "kimi-k2.6",
    streaming: true,
    tools: true,
    temperature: true,
    inputUsdPerMillion: 1.27,
    outputUsdPerMillion: 5.34,
    source: "models.dev",
  },
  "minimax-m2.7": {
    id: "minimax-m2.7",
    streaming: true,
    tools: true,
    temperature: true,
    inputUsdPerMillion: 0.82,
    outputUsdPerMillion: 3.28,
    source: "models.dev",
  },
  "gpt-5.4": {
    id: "gpt-5.4",
    streaming: true,
    tools: true,
    temperature: true,
    inputUsdPerMillion: 1.8,
    outputUsdPerMillion: 10.8,
    source: "models.dev",
  },
  "claude-opus-4-8": {
    id: "claude-opus-4-8",
    streaming: true,
    tools: true,
    temperature: false,
    inputUsdPerMillion: 0.42,
    outputUsdPerMillion: 2.13,
    source: "models.dev",
  },
};

const liveCache = new Map<string, ModelCapabilities>();

export function rememberLiveModel(id: string, partial?: Partial<ModelCapabilities>) {
  const existing = liveCache.get(id) ?? CATALOG_SNAPSHOT[id];
  liveCache.set(id, {
    id,
    streaming: partial?.streaming ?? existing?.streaming ?? true,
    tools: partial?.tools ?? existing?.tools ?? "unknown",
    temperature: partial?.temperature ?? existing?.temperature ?? "unknown",
    inputUsdPerMillion:
      partial?.inputUsdPerMillion ?? existing?.inputUsdPerMillion ?? null,
    outputUsdPerMillion:
      partial?.outputUsdPerMillion ?? existing?.outputUsdPerMillion ?? null,
    source: "live",
  });
}

export function getModelCapabilities(modelId: string): ModelCapabilities {
  return (
    liveCache.get(modelId) ??
    CATALOG_SNAPSHOT[modelId] ?? {
      id: modelId,
      streaming: true,
      tools: "unknown",
      temperature: "unknown",
      inputUsdPerMillion: modelId.endsWith(":free") ? 0 : null,
      outputUsdPerMillion: modelId.endsWith(":free") ? 0 : null,
      source: modelId.endsWith(":free") ? "docs" : "env",
    }
  );
}

export function assertToolsSupported(modelId: string, needsTools: boolean) {
  if (!needsTools) {
    return;
  }
  const caps = getModelCapabilities(modelId);
  if (caps.tools === false) {
    throw new UnorouterError({
      message: `Model ${modelId} does not support tool calling.`,
      code: "model_capability",
      status: 400,
      modelId,
    });
  }
}

export function samplingForModel(
  modelId: string,
  options: { temperature?: number; topP?: number; maxOutputTokens?: number },
): { temperature?: number; topP?: number; max_tokens?: number } {
  const caps = getModelCapabilities(modelId);
  const body: { temperature?: number; topP?: number; max_tokens?: number } = {};
  if (caps.temperature !== false && typeof options.temperature === "number") {
    body.temperature = options.temperature;
  }
  if (typeof options.topP === "number") {
    body.topP = options.topP;
  }
  if (typeof options.maxOutputTokens === "number") {
    body.max_tokens = options.maxOutputTokens;
  }
  return body;
}

export function estimateCostUsd(input: {
  modelId: string;
  promptTokens: number;
  completionTokens: number;
}): number | null {
  const caps = getModelCapabilities(input.modelId);
  if (caps.inputUsdPerMillion == null || caps.outputUsdPerMillion == null) {
    return null;
  }
  return (
    (input.promptTokens / 1_000_000) * caps.inputUsdPerMillion +
    (input.completionTokens / 1_000_000) * caps.outputUsdPerMillion
  );
}

