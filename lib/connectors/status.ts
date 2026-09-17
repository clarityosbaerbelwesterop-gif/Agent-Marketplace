import type { ConnectorGrantApiStatus } from "./types";

export type DbConnectorGrantStatus = "pending" | "granted" | "revoked" | "expired";

export function toApiStatus(status: string): ConnectorGrantApiStatus {
  if (status === "granted") {
    return "active";
  }
  if (status === "revoked") {
    return "revoked";
  }
  return "pending";
}

export function isActiveGrant(status: string): boolean {
  return status === "granted";
}

export function hasStoredCredentials(credentials: unknown): boolean {
  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) {
    return false;
  }
  const record = credentials as {
    accessToken?: unknown;
    apiKeys?: unknown;
  };
  if (typeof record.accessToken === "string" && record.accessToken.trim()) {
    return true;
  }
  if (record.apiKeys && typeof record.apiKeys === "object" && !Array.isArray(record.apiKeys)) {
    return Object.values(record.apiKeys as Record<string, unknown>).some(
      (value) => typeof value === "string" && value.trim().length > 0,
    );
  }
  return false;
}
