/**
 * FreeLLM-API connection settings.
 *
 * FreeLLM is an OpenAI-compatible /v1 router (self-hosted or operator URL).
 * Docs: https://github.com/tashfeenahmed/freellmapi
 *
 * Canonical secret: FREELLM_API_KEY
 * Optional override: FREELLM_BASE_URL (default http://127.0.0.1:3001/v1)
 *
 * This is a secondary/failover path next to UNOROUTER, not a replacement.
 */
import { ProviderError } from "@/lib/llm/errors";

export const DEFAULT_FREELLM_BASE_URL = "http://127.0.0.1:3001/v1";
export const FREELLM_DOCS_URL = "https://github.com/tashfeenahmed/freellmapi";
export const FREELLM_DOCS = FREELLM_DOCS_URL;

export const DEFAULT_TIMEOUT_MS = 55_000;
export const DEFAULT_MAX_RETRIES = 2;

export function getFreellmBaseUrl(): string {
  const raw = process.env.FREELLM_BASE_URL?.trim() || DEFAULT_FREELLM_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function isFreellmConfigured(): boolean {
  return Boolean(process.env.FREELLM_API_KEY?.trim());
}

export function getFreellmApiKey(): string {
  const key = process.env.FREELLM_API_KEY?.trim();
  if (!key) {
    throw new ProviderError({
      provider: "freellm",
      message:
        `FREELLM_API_KEY is not set. Point FREELLM_BASE_URL at an OpenAI-compatible FreeLLM /v1 router (${FREELLM_DOCS_URL}) and set FREELLM_API_KEY. ` +
        "The adapter loads without a key; runtime failover calls fail until it is present.",
      code: "not_configured",
      status: 503,
    });
  }
  return key;
}

export function getFreellmTimeoutMs(): number {
  const raw = Number(process.env.FREELLM_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw >= 1000) {
    return Math.min(raw, 120_000);
  }
  return DEFAULT_TIMEOUT_MS;
}

export function getFreellmMaxRetries(): number {
  const raw = Number(process.env.FREELLM_MAX_RETRIES);
  if (Number.isFinite(raw) && raw >= 0) {
    return Math.min(Math.floor(raw), 4);
  }
  return DEFAULT_MAX_RETRIES;
}

/** Prefer FreeLLM before UnoRouter when set (`1` / `true` / `freellm`). */
export function isFreellmPreferred(): boolean {
  const raw = (
    process.env.FREELLM_PREFERRED?.trim() ||
    process.env.MODEL_CAPACITY?.trim() ||
    ""
  ).toLowerCase();
  return raw === "1" || raw === "true" || raw === "freellm";
}

export const getRequestTimeoutMs = getFreellmTimeoutMs;
export const getMaxRetries = getFreellmMaxRetries;
