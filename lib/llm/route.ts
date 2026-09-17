import { isPaidModelAlias, modelsForAlias } from "@/lib/unorouter/aliases";
import type { ModelAlias } from "@/lib/unorouter/types";
import { isUnorouterConfigured } from "@/lib/unorouter/config";
import { isFreellmConfigured } from "@/lib/freellm/config";
import { modelsForFreellmAlias } from "@/lib/freellm/aliases";
import type { ProviderId } from "./errors";

export type RouteRole = "primary" | "same_tier_fallback" | "failover" | "high_volume";

export type RouteCandidate = {
  provider: ProviderId;
  modelId: string;
  role: RouteRole;
  /** True when a paid/Frontier alias is served by FreeLLM (must be recorded). */
  downgradedFromPaid: boolean;
};

export type ModelRoute = {
  alias: ModelAlias;
  unorouterConfigured: boolean;
  freellmConfigured: boolean;
  highVolume: boolean;
  preferUnorouter: boolean;
  candidates: RouteCandidate[];
};

/** Usage at or above this share of the included window is "high-volume continuation". */
export const HIGH_VOLUME_USAGE_RATIO = 0.5;
export const HIGH_VOLUME_TOKEN_FLOOR = 80_000;

export function isHighVolumeUsage(input: {
  usageConsumed?: number | null;
  usageIncluded?: number | null;
}): boolean {
  const consumed = Number(input.usageConsumed ?? 0);
  const included = Number(input.usageIncluded ?? 0);
  if (consumed >= HIGH_VOLUME_TOKEN_FLOOR) {
    return true;
  }
  if (included > 0 && consumed / included >= HIGH_VOLUME_USAGE_RATIO) {
    return true;
  }
  return false;
}

function pushUnique(
  list: RouteCandidate[],
  candidate: RouteCandidate,
): void {
  if (list.some((row) => row.provider === candidate.provider && row.modelId === candidate.modelId)) {
    return;
  }
  list.push(candidate);
}

/**
 * Build the provider/model walk order for one turn.
 *
 * - Paid / Frontier: UNOROUTER first (same-tier fallbacks only). FreeLLM is
 *   appended as failover / high-volume continuation. The actual model id is
 *   always recorded; `downgradedFromPaid` is true on FreeLLM hops.
 * - Standard: UNOROUTER first when configured; FreeLLM is available for
 *   throughput continuation without a paid-tier downgrade flag.
 * - Missing UNOROUTER + configured FreeLLM: FreeLLM is the only path.
 * - Neither key: empty candidates (caller returns HTTP 503).
 */
export function buildModelRoute(input: {
  alias: ModelAlias;
  usageConsumed?: number | null;
  usageIncluded?: number | null;
}): ModelRoute {
  const unorouterConfigured = isUnorouterConfigured();
  const freellmConfigured = isFreellmConfigured();
  const highVolume = isHighVolumeUsage(input);
  const paid = isPaidModelAlias(input.alias);
  const preferUnorouter = paid || unorouterConfigured;
  const candidates: RouteCandidate[] = [];

  const unorouterModels = unorouterConfigured ? modelsForAlias(input.alias) : [];
  const freellmModels = freellmConfigured ? modelsForFreellmAlias(input.alias) : [];

  if (unorouterConfigured) {
    unorouterModels.forEach((modelId, index) => {
      pushUnique(candidates, {
        provider: "unorouter",
        modelId,
        role: index === 0 ? "primary" : "same_tier_fallback",
        downgradedFromPaid: false,
      });
    });
  }

  if (freellmConfigured) {
    const role: RouteRole = !unorouterConfigured
      ? "primary"
      : highVolume
        ? "high_volume"
        : "failover";
    const insertAt =
      unorouterConfigured && highVolume && unorouterModels.length > 0
        ? 1
        : candidates.length;
    const freellmCandidates: RouteCandidate[] = freellmModels.map((modelId, index) => ({
      provider: "freellm" as const,
      modelId,
      role: index === 0 ? role : "failover",
      downgradedFromPaid: paid,
    }));
    candidates.splice(insertAt, 0, ...freellmCandidates.filter((candidate) => {
      return !candidates.some(
        (row) => row.provider === candidate.provider && row.modelId === candidate.modelId,
      );
    }));
  }

  return {
    alias: input.alias,
    unorouterConfigured,
    freellmConfigured,
    highVolume,
    preferUnorouter,
    candidates,
  };
}

export function modelRoutingUnavailableMessage(): string {
  return (
    "No model provider is configured. Set UNOROUTER_API_KEY (preferred for paid/Frontier tiers) " +
    "and/or FREELLM_API_KEY for failover / high-volume continuation."
  );
}
