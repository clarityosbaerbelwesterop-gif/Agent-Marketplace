import type { ScpHookKind, ScpHookResult } from "./types";

const DEFAULT_TIMEOUT_MS = 8_000;

export function scpBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env.SCP_BASE_URL?.trim() || env.ODIN_SCP_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

export function scpHookPath(kind: ScpHookKind): string {
  return kind === "verify" ? "/hooks/verify" : "/hooks/pr";
}

/**
 * MCP-shaped hook names for Verify / PR. Execution stays on the shared
 * Odin/SCP endpoint when configured — this is not a second verifier.
 */
export const SCP_HOOK_TOOLS = [
  {
    name: "scp_verify",
    description:
      "Ask the shared execution hook to verify the planned change. Do not run a local harness.",
  },
  {
    name: "scp_open_pr",
    description:
      "Ask the shared execution hook to open a change request. Do not fabricate a merge.",
  },
] as const;

export async function invokeScpHook(input: {
  kind: ScpHookKind;
  payload: unknown;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<ScpHookResult> {
  const env = input.env ?? process.env;
  const base = scpBaseUrl(env);
  if (!base) {
    return {
      ok: true,
      wired: false,
      kind: input.kind,
      status: "stub",
      message:
        input.kind === "verify"
          ? "Verify handed to the shared execution hook (stub). No local verifier ran."
          : "Change request handed to the shared execution hook (stub). No merge was invented.",
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = `${base}${scpHookPath(input.kind)}`;

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        kind: input.kind,
        tool:
          input.kind === "verify" ? SCP_HOOK_TOOLS[0].name : SCP_HOOK_TOOLS[1].name,
        payload: input.payload,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      return {
        ok: false,
        wired: true,
        kind: input.kind,
        status: "unreachable",
        message: `Shared execution hook returned HTTP ${response.status}.`,
      };
    }

    return {
      ok: true,
      wired: true,
      kind: input.kind,
      status: "accepted",
      message:
        input.kind === "verify"
          ? "Verify accepted by the shared execution hook."
          : "Change request accepted by the shared execution hook.",
    };
  } catch {
    return {
      ok: false,
      wired: true,
      kind: input.kind,
      status: "unreachable",
      message: "Shared execution hook did not respond.",
    };
  }
}
