import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STUDIO_CAPABILITY_LABELS, STUDIO_NODES, isStudioGraphLinear } from "../lib/studio/graph";
import { planFromBrief } from "../lib/studio/plan";
import { runStudioGraph } from "../lib/studio/pipeline";
import { invokeScpHook, SCP_HOOK_TOOLS, scpBaseUrl, scpHookPath } from "../lib/studio/scp";
import { applyStudioSseBlock } from "../lib/studio/sse-client";
import { studioToolsSnapshot } from "../lib/studio/tools";
import type { StudioEvent } from "../lib/studio/types";
import { encodeSse } from "../lib/runtime/sse";
import { CONNECTOR_LIST } from "../lib/connectors/registry";

const VENDOR_COPY = [
  "Neon",
  "Stripe",
  "GitHub",
  "Slack",
  "Vercel",
  "Supabase",
  "UnoRouter",
  "FreeLLM",
  "Zapier",
  "Odin",
  "DeepSeek",
  "Zeus",
  "Deal-Room",
];

function collectCopy(): string[] {
  return [
    ...STUDIO_NODES.flatMap((node) => [node.label, node.blurb, node.kicker]),
    ...Object.values(STUDIO_CAPABILITY_LABELS),
    planFromBrief("ship a repo deploy").goal,
    ...planFromBrief("ship a repo deploy").outline,
    studioToolsSnapshot().notice,
    ...SCP_HOOK_TOOLS.map((tool) => tool.description),
  ];
}

describe("studio canvas graph", () => {
  it("is a single linear Plan → Tools → Verify → PR graph", () => {
    assert.equal(isStudioGraphLinear(), true);
    assert.deepEqual(
      STUDIO_NODES.map((node) => node.id),
      ["plan", "tools", "verify", "pr"],
    );
  });

  it("plans from a brief without calling a second coding harness", () => {
    const plan = planFromBrief("Open a PR after migrating the database schema");
    assert.match(plan.goal, /migrating the database schema/i);
    assert.equal(plan.capabilities.includes("db"), true);
    assert.equal(plan.capabilities.includes("scm"), true);
    assert.equal(plan.outline.length, 4);
  });

  it("lists connector capabilities without vendor display names or secrets", () => {
    const snapshot = studioToolsSnapshot();
    assert.equal(snapshot.registered, CONNECTOR_LIST.length);
    assert.ok(snapshot.capabilities.length > 0);
    assert.equal(snapshot.activeGrantTools, 0);
    const blob = JSON.stringify(snapshot);
    for (const vendor of ["Neon", "Stripe", "GitHub", "displayName"]) {
      assert.equal(blob.includes(vendor), false, `leaked ${vendor}`);
    }
    assert.equal(blob.includes("credentials"), false);
  });

  it("keeps user-facing studio copy free of vendor names", () => {
    const blob = collectCopy().join("\n");
    for (const vendor of VENDOR_COPY) {
      assert.equal(blob.includes(vendor), false, `leaked ${vendor}`);
    }
  });
});

describe("studio SCP / shared execution hooks", () => {
  it("fails closed when no shared execution hook is configured", async () => {
    const result = await invokeScpHook({
      kind: "verify",
      payload: { plan: "x" },
      env: {},
    });
    assert.equal(result.wired, false);
    assert.equal(result.status, "stub");
    assert.equal(result.ok, false);
    assert.match(result.message, /not connected/i);
    assert.equal(result.message.toLowerCase().includes("odin"), false);
  });

  it("posts verify and PR to the shared hook when a base URL is set", async () => {
    assert.equal(scpBaseUrl({ SCP_BASE_URL: "https://scp.example/v1/" }), "https://scp.example/v1");
    assert.equal(scpHookPath("pr"), "/hooks/pr");

    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ ok: true }), { status: 202 });
    };

    const verify = await invokeScpHook({
      kind: "verify",
      payload: {},
      env: { ODIN_SCP_URL: "https://scp.example/v1" },
      fetchImpl,
    });
    const pr = await invokeScpHook({
      kind: "pr",
      payload: {},
      env: { ODIN_SCP_URL: "https://scp.example/v1" },
      fetchImpl,
    });

    assert.equal(verify.wired, true);
    assert.equal(verify.status, "accepted");
    assert.equal(pr.status, "accepted");
    assert.deepEqual(calls, [
      "https://scp.example/v1/hooks/verify",
      "https://scp.example/v1/hooks/pr",
    ]);
  });
});

describe("studio pipeline SSE", () => {
  it("stops before PR when shared execution is not configured and encodes runtime-compatible SSE", async () => {
    const events: StudioEvent[] = [];
    await runStudioGraph({
      brief: "Add a preview deploy for this branch",
      stepDelayMs: 0,
      runId: "run-test",
      env: {},
      emit: async (event) => {
        events.push(event);
      },
    });

    const steps = events.filter((event) => event.type === "step");
    const succeeded = steps.filter((event) => event.status === "succeeded");
    assert.deepEqual(
      succeeded.map((event) => event.nodeId),
      ["plan", "tools"],
    );
    const verifyFailed = steps.some(
      (event) => event.nodeId === "verify" && event.status === "failed",
    );
    const prStarted = steps.some(
      (event) => event.nodeId === "pr" && event.status === "running",
    );
    assert.equal(verifyFailed, true);
    assert.equal(prStarted, false);

    const done = events.find((event) => event.type === "done");
    assert.equal(done?.type, "done");
    if (done?.type === "done") {
      assert.equal(done.steps.verify, "failed");
      assert.equal(done.steps.pr, "failed");
      assert.match(done.outputText, /Verify did not complete/);
    }

    const encoded = encodeSse({ type: "step", nodeId: "plan", status: "running" });
    const raw = new TextDecoder().decode(encoded);
    const seen: string[] = [];
    applyStudioSseBlock(raw.trimEnd(), {
      onStep: (event) => seen.push(`${event.nodeId}:${event.status}`),
    });
    assert.deepEqual(seen, ["plan:running"]);
  });

  it("does not open a PR when verify is unreachable", async () => {
    const events: StudioEvent[] = [];
    await runStudioGraph({
      brief: "verify this change",
      stepDelayMs: 0,
      env: { SCP_BASE_URL: "https://scp.example" },
      fetchImpl: async () => new Response("nope", { status: 503 }),
      emit: async (event) => {
        events.push(event);
      },
    });
    const done = events.find((event) => event.type === "done");
    assert.equal(done?.type, "done");
    if (done?.type === "done") {
      assert.equal(done.steps.verify, "failed");
      assert.equal(done.steps.pr, "failed");
    }
    const prSuccess = events.some(
      (event) => event.type === "step" && event.nodeId === "pr" && event.status === "running",
    );
    assert.equal(prSuccess, false);
  });
});
