import type { ConnectorCredentials, JsonObject } from "@/lib/db/json";

export const CONNECTOR_IDS = [
  "neon",
  "github",
  "slack",
  "vercel",
  "supabase",
  "render",
  "stripe",
  "cursor",
] as const;

export type ConnectorId = (typeof CONNECTOR_IDS)[number];

export type ConnectorCapabilityTag =
  | "db"
  | "deploy"
  | "chat"
  | "scm"
  | "payments"
  | "auth"
  | "storage"
  | "ai";

export type ConnectorAuthKind = "oauth" | "api_key" | "mixed";

/** API/UI status. DB stores `granted` for an active connection. */
export type ConnectorGrantApiStatus = "pending" | "active" | "revoked";

export type ConnectorOauthSpec = {
  authorizeUrl: string;
  tokenUrl: string;
  callbackPath: string;
  extraAuthorizeParams?: Record<string, string>;
};

export type ConnectorDefinition = {
  id: ConnectorId;
  displayName: string;
  description: string;
  requiredScopes: string[];
  /** Platform OAuth app secrets (server env). Empty for API-key-only connectors. */
  envSecretNames: string[];
  /** Tenant secrets the user pastes when OAuth is not used. */
  tenantSecretNames: string[];
  capabilityTags: ConnectorCapabilityTag[];
  authKind: ConnectorAuthKind;
  oauth: ConnectorOauthSpec | null;
};

export type PublicConnectorGrant = {
  id: string;
  provider: string;
  scopes: string[];
  status: ConnectorGrantApiStatus;
  hasCredentials: boolean;
  metadata: JsonObject;
  createdAt: string;
  updatedAt: string;
};

export type ConnectorCatalogItem = ConnectorDefinition & {
  oauthConfigured: boolean;
  grant: PublicConnectorGrant | null;
};

export type ConnectorScope = {
  workspaceId: string;
  rentalId: string | null;
  sessionId: string | null;
};

export type ConnectorCredentialsInput = ConnectorCredentials;
