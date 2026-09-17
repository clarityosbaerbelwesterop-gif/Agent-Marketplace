import type { JsonObject } from "@/lib/db/json";

const BLOCKED_KEY =
  /secret|password|credential|apikey|api_key|accesstoken|access_token|refreshtoken|refresh_token|^token$|^authorization$/i;

const SECRET_VALUE_PREFIX =
  /^(sk_live_|sk_test_|rk_live_|rk_test_|whsec_|ghp_|github_pat_|xoxb-|xoxp-|xoxa-)/;

export function isBlockedPublicKey(key: string): boolean {
  const compact = key.replace(/[-_]/g, "");
  return BLOCKED_KEY.test(key) || BLOCKED_KEY.test(compact);
}

export function looksLikeSecretValue(value: string): boolean {
  return SECRET_VALUE_PREFIX.test(value.trim());
}

export function sanitizePublicMetadata(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: JsonObject = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isBlockedPublicKey(key)) {
      continue;
    }
    if (typeof entry === "string" && looksLikeSecretValue(entry)) {
      continue;
    }
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      out[key] = sanitizePublicMetadata(entry);
      continue;
    }
    out[key] = entry;
  }
  return out;
}

/** Substrings that must never appear in public grant/catalog/discovery JSON. */
export function jsonSecretLeaks(
  payload: unknown,
  forbiddenSubstrings: readonly string[],
): string[] {
  const encoded = JSON.stringify(payload);
  return forbiddenSubstrings.filter((item) => item.length > 0 && encoded.includes(item));
}
