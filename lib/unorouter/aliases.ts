import { AGENT_TIER_SET, type AgentTier } from "@/lib/catalog/constants";
import { UnorouterError } from "./errors";
import type { AliasInput, AliasResolution, ModelAlias } from "./types";
import { MODEL_ALIASES } from "./types";

/**
 * Canonical marketplace aliases → UnoRouter model IDs.
 *
 * Defaults are documented catalog IDs (not invented names):
 * - `gpt-oss-120b:free` from the official quickstart
 * - remaining IDs from the models.dev UnoRouter provider list (2026-09-17)
 *
 * Env overrides (operator-explicit, never a silent downgrade):
 *   UNOROUTER_MODEL_STANDARD
 *   UNOROUTER_MODEL_STANDARD_FALLBACKS=id1,id2
 *   …same pattern for ADVANCED / EXPERT / ELITE / FRONTIER
 *
 * Fallbacks stay inside the same alias. A frontier run will not fall back
 * to a standard/free model. Same-name `:free` variants are also excluded
 * from paid-tier fallback lists.
 */
const SNAPSHOT: Record<
  ModelAlias,
  { primary: string; fallbacks: string[]; notes: string }
> = {
  standard: {
    primary: "gpt-oss-120b:free",
    fallbacks: ["deepseek-v4-flash:free", "gemma-4-31b-it:free"],
    notes: "Official quickstart free model, then other free tool-capable IDs.",
  },
  advanced: {
    primary: "gemini-3.5-flash",
    fallbacks: ["gpt-5.5", "deepseek-v4-flash"],
    notes: "Paid mid-tier; no :free fallbacks.",
  },
  expert: {
    primary: "gpt-5.2",
    fallbacks: ["deepseek-v4-pro", "glm-5.2"],
    notes: "Paid strong general models; no :free fallbacks.",
  },
  elite: {
    primary: "claude-sonnet-5",
    fallbacks: ["kimi-k2.6", "minimax-m2.7"],
    notes: "Paid high-tier; no :free fallbacks.",
  },
  frontier: {
    primary: "gpt-5.4",
    fallbacks: ["claude-opus-4-8"],
    notes: "Paid frontier; no :free fallbacks and no weaker aliases.",
  },
};

function envName(alias: ModelAlias): string {
  return `UNOROUTER_MODEL_${alias.toUpperCase()}`;
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

export function isModelAlias(value: string): value is ModelAlias {
  return (MODEL_ALIASES as readonly string[]).includes(value);
}

export function normalizeAlias(input: AliasInput): ModelAlias {
  const raw = (input ?? "standard").trim().toLowerCase();
  if (isModelAlias(raw)) {
    return raw;
  }
  if (AGENT_TIER_SET.has(raw)) {
    return raw as AgentTier;
  }
  throw new UnorouterError({
    message: `Unknown model alias "${input ?? ""}". Expected standard | advanced | expert | elite | frontier.`,
    code: "alias_unresolved",
    status: 400,
  });
}

export function resolveAlias(input: AliasInput): AliasResolution {
  const alias = normalizeAlias(input);
  const snapshot = SNAPSHOT[alias];
  const envPrimary = process.env[envName(alias)]?.trim();
  const envFallbacks = parseCsv(process.env[`${envName(alias)}_FALLBACKS`]);
  const primary = envPrimary || snapshot.primary;
  const fallbacks = envFallbacks.length > 0 ? envFallbacks : snapshot.fallbacks;

  if (isPlaceholder(primary)) {
    throw new UnorouterError({
      message:
        `Model alias "${alias}" is not resolved to a UnoRouter model ID. ` +
        `Set ${envName(alias)} to a catalog ID from GET /v1/models (see ${envName(alias)}_FALLBACKS for same-tier fallbacks).`,
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
    source: envPrimary ? "env" : "catalog-snapshot",
    documented: !envPrimary,
  };
}

export function modelsForAlias(input: AliasInput): string[] {
  const resolved = resolveAlias(input);
  return [resolved.modelId, ...resolved.fallbacks];
}

export function getAliasMap() {
  return MODEL_ALIASES.map((alias) => {
    const resolved = resolveAlias(alias);
    return {
      alias,
      ...SNAPSHOT[alias],
      resolved,
      envVar: envName(alias),
      fallbacksEnvVar: `${envName(alias)}_FALLBACKS`,
    };
  });
}
