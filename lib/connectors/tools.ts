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
    "HIGGSFIELD_API_KEY",
    "LINKEDIN_ACCESS_TOKEN",
    "META_ACCESS_TOKEN",
    "GOOGLE_SEARCH_API_KEY",
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


const READ_ACTION_BY_PROVIDER: Record<ConnectorId, string> = {
  neon: "list_projects",
  github: "list_repositories",
  slack: "list_channels",
  vercel: "list_projects",
  supabase: "inspect_api",
  render: "list_services",
  stripe: "read_balance",
  cursor: "connection_only",
  higgsfield: "connection_only",
  linkedin: "connection_only",
  meta: "connection_only",
  "google-search": "connection_only",
};

export function connectorReadAction(provider: ConnectorId): string {
  return READ_ACTION_BY_PROVIDER[provider];
}

function providerRejected(provider: ConnectorId, response: Response) {
  return {
    ok: false as const,
    error: "not_connected",
    code: "provider_rejected",
    provider,
    status: response.status,
  };
}

async function invokeReadOnlyConnector(
  provider: ConnectorId,
  credentials: ConnectorCredentials,
  requestedAction: string,
) {
  const action = connectorReadAction(provider);
  if (requestedAction && requestedAction !== action) {
    return {
      ok: false as const,
      error: "invalid_action",
      provider,
      requestedAction,
      allowedAction: action,
    };
  }

  if (provider === "cursor") {
    return {
      ok: false as const,
      error: "not_implemented",
      code: "connector_stub",
      provider,
      action,
      message:
        "No stable read API is wired for this connector yet. The stored grant is real; no provider response is fabricated.",
    };
  }

  if (
    provider === "higgsfield" ||
    provider === "linkedin" ||
    provider === "meta" ||
    provider === "google-search"
  ) {
    return {
      ok: false as const,
      error: "not_implemented",
      code: "connector_stub",
      provider,
      action,
      message:
        "This connector is catalog/grant-only in the pre-Stripe build. No provider response is fabricated.",
    };
  }

  if (provider === "supabase") {
    const url = credentials.apiKeys?.SUPABASE_URL?.replace(/\/$/, "");
    const key = credentials.apiKeys?.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return {
        ok: false as const,
        error: "not_connected",
        code: "missing_credentials",
        provider,
      };
    }
    const response = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, authorization: `Bearer ${key}`, accept: "application/json" },
    });
    if (!response.ok && response.status !== 404) {
      return providerRejected(provider, response);
    }
    return {
      ok: true as const,
      provider,
      action,
      reachable: true,
      status: response.status,
    };
  }

  const token = bearer(credentials);
  if (!token) {
    return {
      ok: false as const,
      error: "not_connected",
      code: "missing_credentials",
      provider,
    };
  }

  if (provider === "github") {
    const response = await fetch(
      "https://api.github.com/user/repos?per_page=20&sort=updated&affiliation=owner,collaborator,organization_member",
      {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "user-agent": "agent-marketplace",
        },
      },
    );
    if (!response.ok) return providerRejected(provider, response);
    const rows = (await response.json()) as Array<{
      id?: unknown;
      name?: unknown;
      full_name?: unknown;
      private?: unknown;
      html_url?: unknown;
    }>;
    return {
      ok: true as const,
      provider,
      action,
      items: Array.isArray(rows)
        ? rows.slice(0, 20).map((row) => ({
            id: row.id,
            name: row.name,
            fullName: row.full_name,
            private: row.private,
            url: row.html_url,
          }))
        : [],
    };
  }

  if (provider === "slack") {
    const response = await fetch(
      "https://slack.com/api/conversations.list?limit=20&types=public_channel",
      { headers: { authorization: `Bearer ${token}` } },
    );
    const body = (await response.json().catch(() => null)) as
      | { ok?: unknown; error?: unknown; channels?: Array<{ id?: unknown; name?: unknown }> }
      | null;
    if (!response.ok || body?.ok !== true) {
      return {
        ok: false as const,
        error: "not_connected",
        code: "provider_rejected",
        provider,
        status: response.status,
        detail: typeof body?.error === "string" ? body.error : undefined,
      };
    }
    return {
      ok: true as const,
      provider,
      action,
      items: (body.channels ?? []).slice(0, 20).map((channel) => ({
        id: channel.id,
        name: channel.name,
      })),
    };
  }

  if (provider === "vercel") {
    const response = await fetch("https://api.vercel.com/v9/projects?limit=20", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) return providerRejected(provider, response);
    const body = (await response.json()) as {
      projects?: Array<{ id?: unknown; name?: unknown; framework?: unknown }>;
    };
    return {
      ok: true as const,
      provider,
      action,
      items: (body.projects ?? []).slice(0, 20).map((project) => ({
        id: project.id,
        name: project.name,
        framework: project.framework,
      })),
    };
  }

  if (provider === "neon") {
    const response = await fetch("https://console.neon.tech/api/v2/projects?limit=20", {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!response.ok) return providerRejected(provider, response);
    const body = (await response.json()) as {
      projects?: Array<{ id?: unknown; name?: unknown; region_id?: unknown }>;
    };
    return {
      ok: true as const,
      provider,
      action,
      items: (body.projects ?? []).slice(0, 20).map((project) => ({
        id: project.id,
        name: project.name,
        region: project.region_id,
      })),
    };
  }

  if (provider === "render") {
    const response = await fetch("https://api.render.com/v1/services?limit=20", {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!response.ok) return providerRejected(provider, response);
    const body = (await response.json()) as Array<{
      service?: { id?: unknown; name?: unknown; type?: unknown };
    }>;
    return {
      ok: true as const,
      provider,
      action,
      items: Array.isArray(body)
        ? body.slice(0, 20).map((row) => ({
            id: row.service?.id,
            name: row.service?.name,
            type: row.service?.type,
          }))
        : [],
    };
  }

  if (provider === "stripe") {
    const response = await fetch("https://api.stripe.com/v1/balance", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) return providerRejected(provider, response);
    const body = (await response.json()) as {
      available?: Array<{ amount?: unknown; currency?: unknown }>;
      pending?: Array<{ amount?: unknown; currency?: unknown }>;
    };
    return {
      ok: true as const,
      provider,
      action,
      available: (body.available ?? []).map((row) => ({
        amount: row.amount,
        currency: row.currency,
      })),
      pending: (body.pending ?? []).map((row) => ({
        amount: row.amount,
        currency: row.currency,
      })),
      paymentFlowTriggered: false,
    };
  }

  return {
    ok: false as const,
    error: "not_implemented",
    code: "connector_stub",
    provider,
    action,
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
        description: `Run the safe pre-Stripe read action for ${definition.displayName}. No deploy, payment, messaging, database, or repository writes are performed.`,
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: [connectorReadAction(definition.id)],
            },
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
  args?: Record<string, unknown>;
}): Promise<string> {
  const match = /^(.*)_(status|invoke)$/.exec(input.name);
  if (!match || !isConnectorId(match[1])) {
    return JSON.stringify({ error: `Unknown connector tool "${input.name}"` });
  }
  const provider = match[1];
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
    try {
      return JSON.stringify(
        await invokeReadOnlyConnector(
          provider,
          credentials ?? {},
          String(input.args?.action ?? connectorReadAction(provider)),
        ),
      );
    } catch (error) {
      return JSON.stringify({
        ok: false,
        error: "not_connected",
        code: "provider_error",
        provider,
        message: error instanceof Error ? error.message : "Connector read failed",
      });
    }
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
    if (
      provider === "higgsfield" ||
      provider === "linkedin" ||
      provider === "meta" ||
      provider === "google-search"
    ) {
      return JSON.stringify({
        ok: true,
        provider,
        reachable: false,
        code: "connector_stub",
        message:
          "Tenant credentials are stored. Live API ping is not wired for this grant stub. Do not invent resources.",
      });
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
