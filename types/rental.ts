import type { AgentSlug } from "@/types/agent";

export type RentalStatus = "pending" | "active" | "expired";

/**
 * UI-facing rental session shape. Persistence lives in `lib/runtime/rentals`.
 */
export type RentalSession = {
  id: string;
  agentSlug: AgentSlug;
  durationId: string;
  status: RentalStatus;
  startedAt: string;
  endsAt: string;
};

export type ConnectorConnectionState = "disconnected" | "pending" | "connected";

export type ConnectorPlaceholder = {
  id: string;
  state: ConnectorConnectionState;
};

export type BackgroundJobStatus = "idle" | "queued" | "running" | "completed" | "failed";

export type BackgroundJob = {
  id: string;
  label: string;
  status: BackgroundJobStatus;
  detail?: string;
};
