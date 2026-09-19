"use client";

import { useState } from "react";
import { StudioGraph } from "@/components/studio/studio-graph";
import { StudioRunLog, type StudioLogEntry } from "@/components/studio/studio-run-log";
import { STUDIO_NODE_IDS } from "@/lib/studio/types";
import type { StudioNodeId, StudioStepStatus } from "@/lib/studio/types";
import { consumeStudioSse } from "@/lib/studio/sse-client";

const DEFAULT_BRIEF =
  "Open a focused change: plan the work, bind tools, verify, then open a PR.";

function idleStatuses(): Record<StudioNodeId, StudioStepStatus> {
  return {
    plan: "idle",
    tools: "idle",
    verify: "idle",
    pr: "idle",
  };
}

export function StudioShell() {
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [statuses, setStatuses] = useState(idleStatuses);
  const [entries, setEntries] = useState<StudioLogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  const canRun = brief.trim().length > 0 && !running;

  function appendLog(nodeId: StudioNodeId | undefined, message: string) {
    const at = new Date().toISOString();
    setEntries((current) => [
      ...current,
      {
        id: `${at}-${current.length}`,
        at,
        nodeId,
        message,
      },
    ]);
  }

  async function onRun() {
    if (!canRun) {
      return;
    }
    setRunning(true);
    setError(null);
    setRunId(null);
    setStatuses(idleStatuses());
    setEntries([]);

    try {
      const response = await fetch("/api/studio/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief: brief.trim() }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: unknown;
        } | null;
        const message =
          typeof body?.error === "string" ? body.error : `HTTP ${response.status}`;
        throw new Error(message);
      }

      await consumeStudioSse(response, {
        onMeta: (event) => {
          setRunId(event.runId);
          appendLog(undefined, `Run ${event.runId.slice(0, 8)} · ${event.graphId}`);
        },
        onStep: (event) => {
          setStatuses((current) => ({ ...current, [event.nodeId]: event.status }));
          if (event.status === "queued" || event.status === "running") {
            appendLog(event.nodeId, event.status);
          }
        },
        onLog: (event) => {
          appendLog(event.nodeId, event.message);
        },
        onDone: (event) => {
          appendLog(undefined, event.outputText);
          setStatuses((current) => {
            const next = { ...current };
            for (const id of STUDIO_NODE_IDS) {
              next[id] = event.steps[id];
            }
            return next;
          });
        },
        onError: (message) => {
          setError(message);
          appendLog(undefined, message);
        },
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Run failed";
      setError(message);
      appendLog(undefined, message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-3 border-b border-[#1b2430] bg-[#080b10]/90 px-4 py-3 sm:flex-row sm:items-end sm:px-8">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8090a3]">
            Agent Studio
          </p>
          <h1 className="mt-1 text-lg tracking-tight text-[#eef3f8]">
            Plan → Tools → Verify → PR
          </h1>
          <label className="mt-3 block">
            <span className="sr-only">Change brief</span>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              rows={2}
              spellCheck={false}
              className="w-full resize-none rounded-md border border-[#243044] bg-[#0d1219] px-3 py-2 text-sm text-[#d7deea] outline-none focus:border-[#7ee0b3]"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          {runId ? (
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#4b5a6d]">
              {runId.slice(0, 8)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void onRun()}
            disabled={!canRun}
            className="h-11 rounded-md bg-[#7ee0b3] px-5 text-sm font-medium text-[#07110c] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? "Running…" : "Run graph"}
          </button>
        </div>
      </header>
      {error ? (
        <p className="border-b border-[#1b2430] px-4 py-2 text-xs text-[#f07167] sm:px-8" role="alert">
          {error}
        </p>
      ) : null}
      <StudioGraph statuses={statuses} />
      <StudioRunLog entries={entries} running={running} />
    </div>
  );
}
