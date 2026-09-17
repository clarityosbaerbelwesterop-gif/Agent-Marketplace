import { isPaidModelAlias, normalizeAlias } from "@/lib/unorouter/aliases";
import { ProviderError } from "@/lib/llm/errors";
import type { AliasInput, ModelAlias } from "@/lib/unorouter/types";

/**
 * FreeLLM documented routing strategies (not invented model names).
 * Source: FreeLLM-API REST docs — `auto`, `auto:smart`, `auto:fast`,
 * `auto:reliable`, `auto:balanced`. The router picks a live free-tier model.
 *
 * Env overrides:
 *   FREELLM_MODEL_STANDARD
 *   FREELLM_MODEL_STANDARD_FALLBACKS=id1,id2
 *
 * Paid aliases still may use FreeLLM only as an explicit failover path.
 * The runtime records the actual routed model id on the run.
 */
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
    fallbacks: ["auto:reliable", "auto"],
    notes: "Failover only for paid advanced unless UNOROUTER is missing.",
  },
  expert: {
    primary: "auto:smart",
    fallbacks: ["auto:reliable", "auto"],
    notes: "Failover only for paid expert unless UNOROUTER is missing.",
  },
  elite: {
    primary: "auto:smart",
    fallbacks: ["auto:reliable"],
    notes: "Failover only for paid elite; actual model id is recorded.",
  },
  frontier: {
    primary: "auto:smart",
    fallbacks: ["auto:reliable"],
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

  const uniqueFallbacks = fallbacks.filter(
    (id) => id !== primary && !isPlaceholder(id),
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
