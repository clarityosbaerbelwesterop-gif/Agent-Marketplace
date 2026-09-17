import { DISCOVERY_FETCH_TIMEOUT_MS } from "./sources";

export type TimedFetchResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; error: string };

export async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<TimedFetchResult> {
  const timeoutMs = init.timeoutMs ?? DISCOVERY_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent":
          "Agent-Marketplace/0.1 (MCP catalog discovery; does not install or execute servers)",
        ...init.headers,
      },
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `HTTP ${response.status}${text ? `: ${text.slice(0, 180)}` : ""}`,
      };
    }
    if (!text.trim()) {
      return { ok: true, status: response.status, data: null };
    }
    try {
      return { ok: true, status: response.status, data: JSON.parse(text) };
    } catch {
      return { ok: false, status: 502, error: "Upstream response was not JSON" };
    }
  } catch (error) {
    const aborted =
      (error instanceof Error && error.name === "AbortError") ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError");
    return {
      ok: false,
      status: aborted ? 504 : 502,
      error: aborted
        ? `Timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "Fetch failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
