import { isPaidModelAlias, normalizeAlias } from "@/lib/unorouter/aliases";
import { ProviderError } from "@/lib/llm/errors";
import type { AliasInput, ModelAlias } from "@/lib/unorouter/types";

/**
 * Marketplace aliases → FreeLLM documented routing strategies.
 * Source: FreeLLM-API REST docs — `auto`, `auto:smart`, `auto:fast`,
 * `auto:reliable`, `auto:balanced`. Same-tier-or-better: paid aliases never
 * keep a weaker `auto:fast` / `auto:standard` env override.
 */
const ALIAS_RANK: Record<ModelAlias, number> = {
  standard: 0,
  advanced: 1,
  expert: 2,
  elite: 3,
  frontier: 4,
};

const SNAPSHOT: Record<
  ModelAlias,
  { primary: string; fallbacks: string[]; notes: string }
> = {
  standard: {
    primary: "auto:fast",
    fallbacks: ["auto", "auto:balanced"],
    notes: "High-throughput free routing for standard / continuation.",
  },
  advanced: {
    primary: "auto:smart",
    fallbacks: ["auto:reliable", "auto:advanced"],
    notes: "Failover only for paid advanced unless UNOROUTER is missing.",
  },
  expert: {
    primary: "auto:smart",
    fallbacks: ["auto:reliable", "auto:expert"],
    notes: "Failover only for paid expert unless UNOROUTER is missing.",
  },
  elite: {
    primary: "auto:smart",
    fallbacks: ["auto:reliable", "auto:elite"],
    notes: "Failover only for paid elite; actual model id is recorded.",
  },
  frontier: {
    primary: "auto:smart",
    fallbacks: ["auto:reliable", "auto:frontier"],
    notes: "Failover only for frontier; never silent about the routed model.",
  },
};

function envName(alias: ModelAlias): string {
  return `FREELLM_MODEL_${alias.toUpperCase()}`;
}

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isPlaceholder(modelId: string): boolean {
  return (
    modelId.length === 0 ||
    modelId.toUpperCase().startsWith("TBD") ||
    modelId.toUpperCase().startsWith("PLACEHOLDER")
  );
}

export function aliasRank(alias: ModelAlias): number {
  return ALIAS_RANK[alias];
}

/**
 * Rank of a FreeLLM model id. Documented `auto:fast`/`auto` are standard-tier.
 * Unknown operator IDs are treated as same-tier (allowed; not silently weaker).
 */
export function modelIdRank(modelId: string): number | null {
  const raw = modelId.trim().toLowerCase();
  if (
    raw === "auto:fast" ||
    raw === "auto" ||
    raw === "auto:balanced" ||
    raw === "auto:standard"
  ) {
    return 0;
  }
  const match = /^auto:(advanced|expert|elite|frontier)$/.exec(raw);
  if (match) {
    return ALIAS_RANK[match[1] as ModelAlias];
  }
  return null;
}

export function filterSameTierOrBetter(
  alias: ModelAlias,
  modelIds: readonly string[],
): string[] {
  const min = ALIAS_RANK[alias];
  return modelIds.filter((id) => {
    if (isPlaceholder(id)) {
      return false;
    }
    const rank = modelIdRank(id);
    if (rank === null) {
      return true;
    }
    return rank >= min;
  });
}

export type FreellmAliasResolution = {
  alias: ModelAlias;
  modelId: string;
  fallbacks: string[];
  source: "env" | "docs-snapshot";
  paidFailoverOnly: boolean;
};

export function resolveFreellmAlias(input: AliasInput): FreellmAliasResolution {
  const alias = normalizeAlias(input);
  const snapshot = SNAPSHOT[alias];
  const envPrimary = process.env[envName(alias)]?.trim();
  const envFallbacks = parseCsv(process.env[`${envName(alias)}_FALLBACKS`]);
  const primary = envPrimary || snapshot.primary;
  const fallbacks = envFallbacks.length > 0 ? envFallbacks : snapshot.fallbacks;

  if (isPlaceholder(primary)) {
    throw new ProviderError({
      provider: "freellm",
      message:
        `FreeLLM alias "${alias}" is not resolved. Set ${envName(alias)} to a FreeLLM model id or routing strategy (auto, auto:smart, auto:fast).`,
      code: "alias_unresolved",
      status: 503,
    });
  }

  const primaryRank = modelIdRank(primary);
  if (primaryRank !== null && primaryRank < ALIAS_RANK[alias]) {
    throw new ProviderError({
      provider: "freellm",
      message:
        `FreeLLM alias "${alias}" cannot use a weaker profile (${primary}). Same-tier-or-better only.`,
      code: "alias_unresolved",
      status: 503,
    });
  }

  const uniqueFallbacks = filterSameTierOrBetter(
    alias,
    fallbacks.filter((id) => id !== primary && !isPlaceholder(id)),
  );

  return {
    alias,
    modelId: primary,
    fallbacks: uniqueFallbacks,
    source: envPrimary ? "env" : "docs-snapshot",
    paidFailoverOnly: isPaidModelAlias(alias),
  };
}

export function modelsForFreellmAlias(input: AliasInput): string[] {
  const resolved = resolveFreellmAlias(input);
  return [resolved.modelId, ...resolved.fallbacks];
}

export function profileForAlias(alias: ModelAlias): string {
  return SNAPSHOT[alias].primary;
}

export function normalizeFreellmAlias(input: AliasInput): ModelAlias {
  return normalizeAlias(input);
}
