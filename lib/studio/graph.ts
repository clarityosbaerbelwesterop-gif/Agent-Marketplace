import { STUDIO_NODE_IDS, type StudioCapabilityId, type StudioNodeId } from "./types";

export const STUDIO_GRAPH_ID = "plan-tools-verify-pr" as const;

export type StudioNodeDefinition = {
  id: StudioNodeId;
  label: string;
  kicker: string;
  blurb: string;
};

export const STUDIO_NODES: readonly StudioNodeDefinition[] = [
  {
    id: "plan",
    label: "Plan",
    kicker: "01",
    blurb: "Restate the goal. No live coding loop.",
  },
  {
    id: "tools",
    label: "Tools",
    kicker: "02",
    blurb: "Bind registered capabilities. Grants stay pending until connected.",
  },
  {
    id: "verify",
    label: "Verify",
    kicker: "03",
    blurb: "Hand off to the shared execution hook. No local verifier.",
  },
  {
    id: "pr",
    label: "PR",
    kicker: "04",
    blurb: "Open a change request through the same hook.",
  },
] as const;

export type StudioEdgeDefinition = {
  from: StudioNodeId;
  to: StudioNodeId;
};

export const STUDIO_EDGES: readonly StudioEdgeDefinition[] = [
  { from: "plan", to: "tools" },
  { from: "tools", to: "verify" },
  { from: "verify", to: "pr" },
] as const;

export const STUDIO_CAPABILITY_LABELS: Record<StudioCapabilityId, string> = {
  db: "Database",
  deploy: "Deploy",
  chat: "Messaging",
  scm: "Source control",
  payments: "Payments",
  auth: "Auth",
  storage: "Storage",
  ai: "Models",
  media: "Media",
  social: "Social",
  ads: "Ads",
  search: "Search",
};

export function studioNodeOrder(): readonly StudioNodeId[] {
  return STUDIO_NODE_IDS;
}

export function isStudioGraphLinear(): boolean {
  if (STUDIO_NODES.length !== 4) {
    return false;
  }
  const ids = STUDIO_NODES.map((node) => node.id);
  if (ids.join(">") !== "plan>tools>verify>pr") {
    return false;
  }
  return STUDIO_EDGES.every(
    (edge, index) =>
      edge.from === STUDIO_NODE_IDS[index] &&
      edge.to === STUDIO_NODE_IDS[index + 1],
  );
}
