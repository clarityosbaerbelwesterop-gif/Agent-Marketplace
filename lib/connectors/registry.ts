import { CONNECTOR_IDS, type ConnectorDefinition, type ConnectorId } from "./types";

export { CONNECTOR_IDS };

export const CONNECTOR_REGISTRY: Record<ConnectorId, ConnectorDefinition> = {
  neon: {
    id: "neon",
    displayName: "Neon",
    description:
      "Lakebase Postgres, Auth, and related Neon APIs for this rental workspace.",
    requiredScopes: ["projects:read", "projects:write"],
    envSecretNames: [],
    tenantSecretNames: ["NEON_API_KEY"],
    capabilityTags: ["db", "auth", "storage"],
    authKind: "api_key",
    oauth: null,
  },
  github: {
    id: "github",
    displayName: "GitHub",
    description: "Repositories, pull requests, and issues for this rental.",
    requiredScopes: ["read:user", "repo"],
    envSecretNames: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    tenantSecretNames: ["GITHUB_TOKEN"],
    capabilityTags: ["scm"],
    authKind: "mixed",
    oauth: {
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      callbackPath: "/api/connectors/oauth/github/callback",
    },
  },
  slack: {
    id: "slack",
    displayName: "Slack",
    description: "Workspace chat: list channels and post messages during a rental.",
    requiredScopes: ["channels:read", "chat:write"],
    envSecretNames: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
    tenantSecretNames: ["SLACK_BOT_TOKEN"],
    capabilityTags: ["chat"],
    authKind: "mixed",
    oauth: {
      authorizeUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      callbackPath: "/api/connectors/oauth/slack/callback",
    },
  },
  vercel: {
    id: "vercel",
    displayName: "Vercel",
    description: "Deployments and projects on Vercel for this rental.",
    requiredScopes: [],
    envSecretNames: ["VERCEL_CLIENT_ID", "VERCEL_CLIENT_SECRET"],
    tenantSecretNames: ["VERCEL_TOKEN"],
    capabilityTags: ["deploy"],
    authKind: "mixed",
    oauth: {
      authorizeUrl: "https://vercel.com/oauth/authorize",
      tokenUrl: "https://api.vercel.com/v2/oauth/access_token",
      callbackPath: "/api/connectors/oauth/vercel/callback",
    },
  },
  supabase: {
    id: "supabase",
    displayName: "Supabase",
    description: "Supabase project URL and service role for database and auth APIs.",
    requiredScopes: [],
    envSecretNames: [],
    tenantSecretNames: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    capabilityTags: ["db", "auth", "storage"],
    authKind: "api_key",
    oauth: null,
  },
  render: {
    id: "render",
    displayName: "Render",
    description: "Render services and deploys for this rental.",
    requiredScopes: [],
    envSecretNames: [],
    tenantSecretNames: ["RENDER_API_KEY"],
    capabilityTags: ["deploy"],
    authKind: "api_key",
    oauth: null,
  },
  stripe: {
    id: "stripe",
    displayName: "Stripe",
    description:
      "Tenant Stripe API access for the rented agent (not marketplace Checkout).",
    requiredScopes: [],
    envSecretNames: [],
    tenantSecretNames: ["STRIPE_SECRET_KEY"],
    capabilityTags: ["payments"],
    authKind: "api_key",
    oauth: null,
  },
  cursor: {
    id: "cursor",
    displayName: "Cursor",
    description: "Cursor API access for this rental. Not a Grok Bot marketplace plugin.",
    requiredScopes: [],
    envSecretNames: [],
    tenantSecretNames: ["CURSOR_API_KEY"],
    capabilityTags: ["ai", "scm"],
    authKind: "api_key",
    oauth: null,
  },
};

export const CONNECTOR_LIST: ConnectorDefinition[] = CONNECTOR_IDS.map(
  (id) => CONNECTOR_REGISTRY[id],
);

export function isConnectorId(value: string): value is ConnectorId {
  return (CONNECTOR_IDS as readonly string[]).includes(value);
}

export function getConnector(id: string): ConnectorDefinition | null {
  if (!isConnectorId(id)) {
    return null;
  }
  return CONNECTOR_REGISTRY[id];
}

export function oauthEnvConfigured(definition: ConnectorDefinition): boolean {
  if (!definition.oauth || definition.envSecretNames.length === 0) {
    return false;
  }
  return definition.envSecretNames.every((name) => {
    const value = process.env[name];
    return Boolean(value && value.trim());
  });
}

export function readEnvSecret(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}
