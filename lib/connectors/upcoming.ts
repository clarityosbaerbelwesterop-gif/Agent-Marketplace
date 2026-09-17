import type { ConnectorAuthKind, ConnectorCapabilityTag } from "./types";

/**
 * Reserved for connectors that are not yet in the first-party registry.
 * Higgsfield, LinkedIn, Meta, and Google Search landed as grant stubs on main.
 */
export const UPCOMING_CONNECTOR_IDS = [] as const;

export type UpcomingConnectorId = (typeof UPCOMING_CONNECTOR_IDS)[number];

export type UpcomingOauthShell = {
  /** Future callback path; no live authorize/token URLs yet. */
  callbackPath: string;
  authorizeUrl: null;
  tokenUrl: null;
  todo: string;
};

export type UpcomingConnectorDefinition = {
  id: string;
  displayName: string;
  description: string;
  requiredScopes: string[];
  envSecretNames: string[];
  tenantSecretNames: string[];
  capabilityTags: ConnectorCapabilityTag[];
  authKind: ConnectorAuthKind;
  oauth: UpcomingOauthShell | null;
  wave: "upcoming";
  grantable: false;
  backendStatus: "pending_backend";
  notice: string;
};

export const UPCOMING_CONNECTOR_REGISTRY: Record<string, UpcomingConnectorDefinition> =
  {};

export const UPCOMING_CONNECTOR_LIST: UpcomingConnectorDefinition[] = [];

export function isUpcomingConnectorId(value: string): value is UpcomingConnectorId {
  return (UPCOMING_CONNECTOR_IDS as readonly string[]).includes(value);
}

export function getUpcomingConnector(
  id: string,
): UpcomingConnectorDefinition | null {
  if (!isUpcomingConnectorId(id)) {
    return null;
  }
  return UPCOMING_CONNECTOR_REGISTRY[id] ?? null;
}
