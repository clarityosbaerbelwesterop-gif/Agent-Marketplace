import {
  chatComplete as freellmComplete,
  chatStream as freellmStream,
  isFreellmConfigured,
  isFreellmPreferred,
  modelsForFreellmAlias,
  FreellmError,
} from "@/lib/freellm";
import {
  chatComplete as unorouterComplete,
  chatStream as unorouterStream,
  isUnorouterConfigured,
  UnorouterError,
} from "@/lib/unorouter";
import { FREELLM_DOCS } from "@/lib/freellm/config";
import { UNOROUTER_TOKEN_URL } from "@/lib/unorouter/config";
import type {
  ChatRequest,
  ChatResult,
  ModelAlias,
  StreamChunk,
} from "@/lib/unorouter/types";

export type CapacityProvider = "unorouter" | "freellm";

export type CapacityTurn = ChatResult & {
  provider: CapacityProvider;
};

const FAILOVER_CODES = new Set([
  "rate_limited",
  "timeout",
  "provider_unavailable",
  "payment_required",
  "not_configured",
]);

export function isCapacityFailoverError(error: unknown): boolean {
  if (error instanceof UnorouterError || error instanceof FreellmError) {
    return FAILOVER_CODES.has(error.code);
  }
  return false;
}

export function isModelCapacityConfigured(): boolean {
  return isUnorouterConfigured() || isFreellmConfigured();
}

export function capacityUnavailableMessage(): string {
  return (
    `No model capacity is configured. Set UNOROUTER_API_KEY (create a key at ${UNOROUTER_TOKEN_URL}) ` +
    `and/or FREELLM_API_KEY + FREELLM_BASE_URL (${FREELLM_DOCS}). Runtime calls fail until at least one key is present.`
  );
}

export function capacityOrder(): CapacityProvider[] {
  if (isFreellmPreferred() && isFreellmConfigured()) {
    return isUnorouterConfigured()
      ? ["freellm", "unorouter"]
      : ["freellm"];
  }
  if (isUnorouterConfigured() && isFreellmConfigured()) {
    return ["unorouter", "freellm"];
  }
  if (isUnorouterConfigured()) {
    return ["unorouter"];
  }
  if (isFreellmConfigured()) {
    return ["freellm"];
  }
  return [];
}

function modelsForProvider(
  provider: CapacityProvider,
  alias: ModelAlias,
  unorouterModelIds: string[],
): string[] {
  if (provider === "unorouter") {
    return unorouterModelIds;
  }
  return modelsForFreellmAlias(alias);
}

async function completeOnProvider(
  provider: CapacityProvider,
  model: string,
  request: Omit<ChatRequest, "model">,
): Promise<ChatResult> {
  if (provider === "unorouter") {
    return unorouterComplete({ ...request, model });
  }
  return freellmComplete({ ...request, model });
}

async function* streamOnProvider(
  provider: CapacityProvider,
  model: string,
  request: Omit<ChatRequest, "model">,
): AsyncGenerator<StreamChunk> {
  if (provider === "unorouter") {
    yield* unorouterStream({ ...request, model });
    return;
  }
  yield* freellmStream({ ...request, model });
}

/**
 * Preferred path: UnoRouter for paid/tier-mapped aliases.
 * Fail over to FreeLLM on 429 / timeout / 503 (and 402 quota), or when
 * FreeLLM is preferred / UnoRouter is missing.
 * Within each provider, try same-tier (UnoRouter) or same-tier-or-better (FreeLLM).
 */
export async function chatCompleteWithCapacity(input: {
  alias: ModelAlias;
  unorouterModelIds: string[];
  request: Omit<ChatRequest, "model">;
}): Promise<CapacityTurn> {
  const order = capacityOrder();
  if (order.length === 0) {
    throw new UnorouterError({
      message: capacityUnavailableMessage(),
      code: "not_configured",
      status: 503,
    });
  }

  let lastError: unknown;
  for (const provider of order) {
    const models = modelsForProvider(
      provider,
      input.alias,
      input.unorouterModelIds,
    );
    for (const model of models) {
      try {
        const result = await completeOnProvider(provider, model, input.request);
        return { ...result, provider };
      } catch (error) {
        lastError = error;
        const canSameProvider =
          (error instanceof UnorouterError || error instanceof FreellmError) &&
          (error.code === "not_found" || error.code === "provider_unavailable");
        const canCross =
          isCapacityFailoverError(error) && order.indexOf(provider) < order.length - 1;
        if (canSameProvider) {
          continue;
        }
        if (canCross) {
          break;
        }
        throw error;
      }
    }
  }
  throw lastError;
}

export async function* chatStreamWithCapacity(input: {
  alias: ModelAlias;
  unorouterModelIds: string[];
  request: Omit<ChatRequest, "model">;
}): AsyncGenerator<StreamChunk & { provider?: CapacityProvider }> {
  const order = capacityOrder();
  if (order.length === 0) {
    throw new UnorouterError({
      message: capacityUnavailableMessage(),
      code: "not_configured",
      status: 503,
    });
  }

  let lastError: unknown;
  for (const provider of order) {
    const models = modelsForProvider(
      provider,
      input.alias,
      input.unorouterModelIds,
    );
    for (const model of models) {
      let yielded = false;
      try {
        for await (const chunk of streamOnProvider(provider, model, input.request)) {
          yielded = true;
          yield chunk.type === "finish"
            ? { ...chunk, provider }
            : chunk;
        }
        return;
      } catch (error) {
        lastError = error;
        if (yielded) {
          throw error;
        }
        const canSameProvider =
          (error instanceof UnorouterError || error instanceof FreellmError) &&
          (error.code === "not_found" || error.code === "provider_unavailable");
        const canCross =
          isCapacityFailoverError(error) && order.indexOf(provider) < order.length - 1;
        if (canSameProvider) {
          continue;
        }
        if (canCross) {
          break;
        }
        throw error;
      }
    }
  }
  throw lastError;
}

export function isLengthFinish(reason: string | null | undefined): boolean {
  if (!reason) {
    return false;
  }
  const normalized = reason.toLowerCase();
  return (
    normalized === "length" ||
    normalized === "max_tokens" ||
    normalized === "max_output_tokens"
  );
}

export const MAX_CONTINUATIONS = 3;

export function continuationUserMessage(partial: string): string {
  return [
    "Continue from the exact cutoff. Do not restart or summarize from scratch.",
    "Do not invent new facts to fill gaps. If the previous draft was incomplete, finish it.",
    partial.trim()
      ? `Last characters before cutoff: …${partial.slice(-240)}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}
