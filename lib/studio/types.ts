export const STUDIO_NODE_IDS = ["plan", "tools", "verify", "pr"] as const;

export type StudioNodeId = (typeof STUDIO_NODE_IDS)[number];

export type StudioStepStatus = "idle" | "queued" | "running" | "succeeded" | "failed";

export type StudioCapabilityId =
  | "db"
  | "deploy"
  | "chat"
  | "scm"
  | "payments"
  | "auth"
  | "storage"
  | "ai"
  | "media"
  | "social"
  | "ads"
  | "search";

export type StudioPlan = {
  goal: string;
  outline: string[];
  capabilities: StudioCapabilityId[];
};

export type StudioToolsSnapshot = {
  registered: number;
  capabilities: Array<{ id: StudioCapabilityId; label: string; count: number }>;
  activeGrantTools: number;
  notice: string;
};

export type ScpHookKind = "verify" | "pr";

export type ScpHookResult = {
  ok: boolean;
  wired: boolean;
  kind: ScpHookKind;
  status: "stub" | "accepted" | "unreachable";
  message: string;
};

export type StudioEvent =
  | { type: "meta"; runId: string; graphId: "plan-tools-verify-pr" }
  | {
      type: "step";
      nodeId: StudioNodeId;
      status: Exclude<StudioStepStatus, "idle">;
      detail?: string;
    }
  | { type: "log"; nodeId: StudioNodeId; message: string }
  | {
      type: "done";
      outputText: string;
      steps: Record<StudioNodeId, "succeeded" | "failed">;
    }
  | { type: "error"; message: string; code: string };
