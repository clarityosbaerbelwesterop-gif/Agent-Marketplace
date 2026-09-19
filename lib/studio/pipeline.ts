import { randomUUID } from "node:crypto";
import type { PublicConnectorGrant } from "@/lib/connectors/types";
import { STUDIO_GRAPH_ID, STUDIO_NODES } from "./graph";
import { planFromBrief } from "./plan";
import { invokeScpHook } from "./scp";
import { studioToolsSnapshot } from "./tools";
import type {
  StudioEvent,
  StudioNodeId,
  StudioPlan,
  StudioToolsSnapshot,
} from "./types";

export type StudioPipelineInput = {
  brief: string;
  emit: (event: StudioEvent) => Promise<void>;
  grants?: PublicConnectorGrant[];
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  stepDelayMs?: number;
  runId?: string;
};

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runNode(
  emit: (event: StudioEvent) => Promise<void>,
  nodeId: StudioNodeId,
  delayMs: number,
  work: () => Promise<string>,
): Promise<"succeeded" | "failed"> {
  await emit({ type: "step", nodeId, status: "running" });
  await sleep(delayMs);
  try {
    const detail = await work();
    await emit({ type: "log", nodeId, message: detail });
    await emit({ type: "step", nodeId, status: "succeeded", detail });
    return "succeeded";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Step failed";
    await emit({ type: "log", nodeId, message });
    await emit({ type: "step", nodeId, status: "failed", detail: message });
    return "failed";
  }
}

function describePlan(plan: StudioPlan): string {
  return [`Goal: ${plan.goal}`, ...plan.outline.map((line) => `• ${line}`)].join(
    "\n",
  );
}

function describeTools(snapshot: StudioToolsSnapshot): string {
  const caps = snapshot.capabilities
    .map((row) => `${row.label} (${row.count})`)
    .join(", ");
  return [
    `Registered connectors: ${snapshot.registered}.`,
    `Capabilities: ${caps}.`,
    snapshot.notice,
  ].join(" ");
}

/**
 * One-shot Plan → Tools → Verify → PR. Durable rental sessions/runs stay on
 * `/api/chat`. This canvas reuses SSE + connector inventory and stubs Verify/PR
 * toward the shared execution hook.
 */
export async function runStudioGraph(input: StudioPipelineInput): Promise<void> {
  const brief = input.brief.trim();
  if (!brief) {
    await input.emit({
      type: "error",
      message: "brief is required",
      code: "invalid_brief",
    });
    return;
  }

  const runId = input.runId ?? randomUUID();
  const delayMs = input.stepDelayMs ?? 80;
  const steps: Record<StudioNodeId, "succeeded" | "failed"> = {
    plan: "failed",
    tools: "failed",
    verify: "failed",
    pr: "failed",
  };

  await input.emit({ type: "meta", runId, graphId: STUDIO_GRAPH_ID });
  for (const node of STUDIO_NODES) {
    await input.emit({ type: "step", nodeId: node.id, status: "queued" });
  }

  let plan: StudioPlan | null = null;
  steps.plan = await runNode(input.emit, "plan", delayMs, async () => {
    plan = planFromBrief(brief);
    return describePlan(plan);
  });
  if (steps.plan === "failed" || !plan) {
    await input.emit({
      type: "done",
      outputText: "Plan failed. Later nodes were not started.",
      steps,
    });
    return;
  }

  const resolvedPlan: StudioPlan = plan;
  let snapshot: StudioToolsSnapshot | null = null;
  steps.tools = await runNode(input.emit, "tools", delayMs, async () => {
    snapshot = studioToolsSnapshot(input.grants ?? []);
    return describeTools(snapshot);
  });
  if (steps.tools === "failed" || !snapshot) {
    await input.emit({
      type: "done",
      outputText: "Tools inventory failed. Verify/PR were not started.",
      steps,
    });
    return;
  }

  const resolvedSnapshot: StudioToolsSnapshot = snapshot;
  steps.verify = await runNode(input.emit, "verify", delayMs, async () => {
    const result = await invokeScpHook({
      kind: "verify",
      payload: { plan: resolvedPlan, tools: resolvedSnapshot },
      env: input.env,
      fetchImpl: input.fetchImpl,
    });
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.message;
  });
  if (steps.verify === "failed") {
    await input.emit({
      type: "done",
      outputText: "Verify did not complete. PR was not started.",
      steps,
    });
    return;
  }

  steps.pr = await runNode(input.emit, "pr", delayMs, async () => {
    const result = await invokeScpHook({
      kind: "pr",
      payload: { plan: resolvedPlan, tools: resolvedSnapshot, verify: "handed_off" },
      env: input.env,
      fetchImpl: input.fetchImpl,
    });
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.message;
  });

  const failed = Object.values(steps).some((status) => status === "failed");
  await input.emit({
    type: "done",
    outputText: failed
      ? "Graph finished with a failed step."
      : "Graph finished: Plan → Tools → Verify → PR.",
    steps,
  });
}
