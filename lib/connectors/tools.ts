import type { ChatTool } from "@/lib/unorouter/types";
import type { ConnectorCredentials } from "@/lib/db/json";
import { CONNECTOR_REGISTRY, isConnectorId } from "./registry";
import { getConnectorGrantWithSecrets } from "./grants";
import { hasStoredCredentials, isActiveGrant } from "./status";
import type { ConnectorId, PublicConnectorGrant } from "./types";

function notConnected(code: string, message: string) {
  return JSON.stringify({
    ok: false,
    error: "not_connected",
    code,
    message,
  });
}

function bearer(credentials: ConnectorCredentials | null): string | null {
  const token = credentials?.accessToken?.trim();
  if (token) {
    return token;
  }
  const keys = credentials?.apiKeys ?? {};
  for (const name of [
    "GITHUB_TOKEN",
    "SLACK_BOT_TOKEN",
    "VERCEL_TOKEN",
    "NEON_API_KEY",
    "RENDER_API_KEY",
    "STRIPE_SECRET_KEY",
    "CURSOR_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    const value = keys[name]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

async function pingGithub(token: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "user-agent": "agent-marketplace",
    },
  });
  if (!response.ok) {
    return {
      ok: false as const,
      error: "not_connected",
      code: "provider_rejected",
      status: response.status,
    };
  }
  const user = (await response.json()) as { login?: unknown };
  return {
    ok: true as const,
    provider: "github",
    identity: typeof user.login === "string" ? user.login : null,
  };
}

async function pingSlack(token: string) {
  const response = await fetch("https://slack.com/api/auth.test", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  const body = (await response.json().catch(() => null)) as {
    ok?: unknown;
    error?: unknown;
    user?: unknown;
    team?: unknown;
  } | null;
  if (!body || body.ok !== true) {
    return {
      ok: false as const,
      error: "not_connected",
      code: "provider_rejected",
      detail: typeof body?.error === "string" ? body.error : "auth.test failed",
    };
  }
  return {
    ok: true as const,
    provider: "slack",
    identity:
      typeof body.user === "string"
        ? body.user
        : typeof body.team === "string"
          ? body.team
          : null,
  };
}

async function pingVercel(token: string) {
  const response = await fetch("https://api.vercel.com/v2/user", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return {
      ok: false as const,
      error: "not_connected",
      code: "provider_rejected",
      status: response.status,
    };
  }
  const body = (await response.json()) as { user?: { username?: unknown } };
  return {
    ok: true as const,
    provider: "vercel",
    identity:
      typeof body.user?.username === "string" ? body.user.username : null,
  };
}

async function pingNeon(token: string) {
  const response = await fetch("https://console.neon.tech/api/v2/projects?limit=1", {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!response.ok) {
    return {
      ok: false as const,
      error: "not_connected",
      code: "provider_rejected",
      status: response.status,
    };
  }
  return { ok: true as const, provider: "neon", reachable: true };
}

async function pingStripe(token: string) {
  const response = await fetch("https://api.stripe.com/v1/account", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return {
      ok: false as const,
      error: "not_connected",
      code: "provider_rejected",
      status: response.status,
    };
  }
  const body = (await response.json()) as { id?: unknown };
  return {
    ok: true as const,
    provider: "stripe",
    identity: typeof body.id === "string" ? body.id : null,
  };
}

async function pingRender(token: string) {
  const response = await fetch("https://api.render.com/v1/owners?limit=1", {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!response.ok) {
    return {
      ok: false as const,
      error: "not_connected",
      code: "provider_rejected",
      status: response.status,
    };
  }
  return { ok: true as const, provider: "render", reachable: true };
}

async function pingSupabase(credentials: ConnectorCredentials) {
  const url = credentials.apiKeys?.SUPABASE_URL?.replace(/\/$/, "");
  const key = credentials.apiKeys?.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      ok: false as const,
      error: "not_connected",
      code: "missing_credentials",
    };
  }
  const response = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!response.ok && response.status !== 404) {
    return {
      ok: false as const,
      error: "not_connected",
      code: "provider_rejected",
      status: response.status,
    };
  }
  return { ok: true as const, provider: "supabase", reachable: true };
}

async function pingCursor() {
  return {
    ok: false as const,
    error: "not_implemented",
    code: "connector_stub",
    message:
      "Cursor API actions are not wired. The grant is recorded; no credentials were invented.",
  };
}

export function connectorToolsForGrants(grants: PublicConnectorGrant[]): ChatTool[] {
  const tools: ChatTool[] = [];
  for (const grant of grants) {
    if (grant.status !== "active") {
      continue;
    }
    if (!isConnectorId(grant.provider)) {
      continue;
    }
    const definition = CONNECTOR_REGISTRY[grant.provider];
    if (!definition) {
      continue;
    }
    tools.push({
      type: "function",
      function: {
        name: `${definition.id}_status`,
        description: `Check whether the ${definition.displayName} connector grant has usable credentials. Returns not_connected if none are stored. Never invents secrets.`,
        parameters: { type: "object", properties: {} },
      },
    });
    tools.push({
      type: "function",
      function: {
        name: `${definition.id}_invoke`,
        description: `Run a ${definition.displayName} action. Live writes are not implemented; returns a structured stub or not_connected. Do not invent resources.`,
        parameters: {
          type: "object",
          properties: {
            action: { type: "string" },
          },
        },
      },
    });
  }
  return tools;
}

export function isConnectorToolName(name: string): boolean {
  return Object.keys(CONNECTOR_REGISTRY).some(
    (id) => name === `${id}_status` || name === `${id}_invoke`,
  );
}

export async function executeConnectorTool(input: {
  userId: string;
  workspaceId: string;
  name: string;
}): Promise<string> {
  const match = /^(neon|github|slack|vercel|supabase|render|stripe|cursor)_(status|invoke)$/.exec(
    input.name,
  );
  if (!match) {
    return JSON.stringify({ error: `Unknown connector tool "${input.name}"` });
  }
  const provider = match[1] as ConnectorId;
  const kind = match[2];
  const row = await getConnectorGrantWithSecrets({
    userId: input.userId,
    workspaceId: input.workspaceId,
    provider,
  });
  if (!row || !isActiveGrant(row.status)) {
    return notConnected(
      row?.status === "pending" ? "grant_pending" : "grant_inactive",
      `${provider} is not an active grant for this rental workspace.`,
    );
  }
  const credentials = row.credentials ?? null;
  if (!hasStoredCredentials(credentials)) {
    return notConnected(
      "missing_credentials",
      `${provider} is granted but no tenant credentials are stored.`,
    );
  }

  if (kind === "invoke") {
    return JSON.stringify({
      ok: false,
      error: "not_implemented",
      code: "connector_stub",
      provider,
      message: `Live ${provider} writes are not wired. Use ${provider}_status to verify the grant. Do not invent ${provider} resources.`,
    });
  }

  try {
    if (provider === "github") {
      const token = bearer(credentials);
      if (!token) {
        return notConnected("missing_credentials", "GitHub token is empty.");
      }
      return JSON.stringify(await pingGithub(token));
    }
    if (provider === "slack") {
      const token = bearer(credentials);
      if (!token) {
        return notConnected("missing_credentials", "Slack token is empty.");
      }
      return JSON.stringify(await pingSlack(token));
    }
    if (provider === "vercel") {
      const token = bearer(credentials);
      if (!token) {
        return notConnected("missing_credentials", "Vercel token is empty.");
      }
      return JSON.stringify(await pingVercel(token));
    }
    if (provider === "neon") {
      const token = bearer(credentials);
      if (!token) {
        return notConnected("missing_credentials", "Neon API key is empty.");
      }
      return JSON.stringify(await pingNeon(token));
    }
    if (provider === "stripe") {
      const token = bearer(credentials);
      if (!token) {
        return notConnected("missing_credentials", "Stripe secret key is empty.");
      }
      return JSON.stringify(await pingStripe(token));
    }
    if (provider === "render") {
      const token = bearer(credentials);
      if (!token) {
        return notConnected("missing_credentials", "Render API key is empty.");
      }
      return JSON.stringify(await pingRender(token));
    }
    if (provider === "supabase") {
      return JSON.stringify(await pingSupabase(credentials ?? {}));
    }
    if (provider === "cursor") {
      return JSON.stringify(await pingCursor());
    }
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: "not_connected",
      code: "provider_error",
      message: error instanceof Error ? error.message : "Connector ping failed",
    });
  }

  return notConnected("missing_credentials", "No usable credentials.");
}
