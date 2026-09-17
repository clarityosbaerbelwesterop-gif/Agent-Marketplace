/**
 * UnoRouter connection settings.
 *
 * Base URL and key names follow official docs:
 * https://unorouter.com/en/docs/platform/quickstart
 * https://unorouter.com/en/docs/integrations/mcp
 *
 * Canonical secret: UNOROUTER_API_KEY
 * Optional override: UNOROUTER_BASE_URL (default https://api.unorouter.com/v1)
 */
import { UnorouterError } from "./errors";

export const DEFAULT_UNOROUTER_BASE_URL = "https://api.unorouter.com/v1";
export const UNOROUTER_TOKEN_URL = "https://unorouter.com/en/token";
export const UNOROUTER_DOCS_QUICKSTART =
  "https://unorouter.com/en/docs/platform/quickstart";

export const DEFAULT_TIMEOUT_MS = 55_000;
export const DEFAULT_MAX_RETRIES = 2;

export function getUnorouterBaseUrl(): string {
  const raw =
    process.env.UNOROUTER_BASE_URL?.trim() || DEFAULT_UNOROUTER_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function isUnorouterConfigured(): boolean {
  return Boolean(process.env.UNOROUTER_API_KEY?.trim());
}

export function getUnorouterApiKey(): string {
  const key = process.env.UNOROUTER_API_KEY?.trim();
  if (!key) {
    throw new UnorouterError({
      message:
        `UNOROUTER_API_KEY is not set. Create a key at ${UNOROUTER_TOKEN_URL} and set UNOROUTER_API_KEY. ` +
        "The adapter and alias map are implemented; runtime model calls fail until the key is present.",
      code: "not_configured",
      status: 503,
    });
  }
  return key;
}

export function getRequestTimeoutMs(): number {
  const raw = Number(process.env.UNOROUTER_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw >= 1000) {
    return Math.min(raw, 120_000);
  }
  return DEFAULT_TIMEOUT_MS;
}

export function getMaxRetries(): number {
  const raw = Number(process.env.UNOROUTER_MAX_RETRIES);
  if (Number.isFinite(raw) && raw >= 0) {
    return Math.min(Math.floor(raw), 4);
  }
  return DEFAULT_MAX_RETRIES;
}
