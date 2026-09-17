"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

type ChatRun = {
  id: string;
  status: string;
  modelIdUsed: string | null;
  skillVersion: string | null;
  input: { message?: unknown } | null;
  output: { text?: unknown; error?: unknown } | null;
};

type ChatMessageView = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

function messagesFromRuns(runs: ChatRun[]): ChatMessageView[] {
  const items: ChatMessageView[] = [];
  for (const run of runs) {
    const input = run.input?.message;
    if (typeof input === "string" && input.trim()) {
      items.push({ id: `${run.id}-user`, role: "user", text: input });
    }
    const output = run.output?.text;
    const error = run.output?.error;
    if (typeof output === "string" && output.trim()) {
      items.push({ id: `${run.id}-assistant`, role: "assistant", text: output });
    } else if (typeof error === "string" && error.trim()) {
      items.push({
        id: `${run.id}-error`,
        role: "system",
        text: error,
      });
    }
  }
  return items;
}

export function ChatClient({
  rentalId,
  sessionId,
  agentName,
  initialRuns,
}: {
  rentalId: string;
  sessionId: string;
  agentName: string;
  initialRuns: ChatRun[];
}) {
  const [runs, setRuns] = useState(initialRuns);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [background, setBackground] = useState(false);
  const [modelId, setModelId] = useState<string | null>(
    initialRuns.at(-1)?.modelIdUsed ?? null,
  );

  const messages = useMemo(() => {
    const items = messagesFromRuns(runs);
    if (streaming) {
      items.push({ id: "streaming", role: "assistant", text: streaming });
    }
    return items;
  }, [runs, streaming]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setDraft("");
    setStreaming("");
    setRuns((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        status: "running",
        modelIdUsed: modelId,
        skillVersion: null,
        input: { message },
        output: null,
      },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rentalId,
          sessionId,
          message,
          background,
        }),
      });

      if (background) {
        const payload = (await response.json()) as {
          error?: string;
          runId?: string | null;
          status?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Chat request failed");
        }
        setError(
          payload.runId
            ? `Run ${payload.runId} continues in the background. Refresh to see the finished output.`
            : "Background run queued. Refresh to see output.",
        );
        setBusy(false);
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Chat request failed");
      }
      if (!response.body) {
        throw new Error("No stream from chat API");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
      let runId: string | null = null;
      let usedModel: string | null = null;

      const applyEvent = (rawEvent: string) => {
        const lines = rawEvent.split("\n");
        let eventName = "";
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          }
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }
        if (!dataLines.length) {
          return;
        }
        const data = JSON.parse(dataLines.join("\n")) as {
          type?: string;
          text?: string;
          message?: string;
          runId?: string;
          modelId?: string;
          modelIdUsed?: string;
          outputText?: string;
        };
        if (eventName === "meta" || data.type === "meta") {
          runId = data.runId ?? runId;
          usedModel = data.modelId ?? usedModel;
        }
        if (eventName === "delta" || data.type === "delta") {
          assembled += data.text ?? "";
          setStreaming(assembled);
        }
        if (eventName === "done" || data.type === "done") {
          assembled = data.outputText || assembled;
          usedModel = data.modelIdUsed ?? usedModel;
          setStreaming("");
        }
        if (eventName === "error" || data.type === "error") {
          setError(data.message ?? "Run failed");
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        let sep = buffer.indexOf("\n\n");
        while (sep !== -1) {
          applyEvent(buffer.slice(0, sep));
          buffer = buffer.slice(sep + 2);
          sep = buffer.indexOf("\n\n");
        }
        if (done) {
          break;
        }
      }

      setModelId(usedModel);
      setRuns((current) => {
        const next = current.filter((row) => !row.id.startsWith("local-"));
        if (runId) {
          next.push({
            id: runId,
            status: assembled ? "succeeded" : "failed",
            modelIdUsed: usedModel,
            skillVersion: null,
            input: { message },
            output: assembled ? { text: assembled } : { error: "empty response" },
          });
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setBusy(false);
      setStreaming("");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Chatting with {agentName}. Runs persist in Postgres so work can finish
        after the tab closes.
        {modelId ? (
          <>
            {" "}
            Last model: <code className="font-mono text-xs">{modelId}</code>
          </>
        ) : null}
      </p>
      <ol className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-md border border-border p-4">
        {messages.length === 0 ? (
          <li className="text-sm text-muted">No messages yet.</li>
        ) : (
          messages.map((item) => (
            <li key={item.id} className="text-sm leading-relaxed">
              <span className="font-medium">
                {item.role === "user"
                  ? "You"
                  : item.role === "system"
                    ? "System"
                    : agentName}
              </span>
              <p className="whitespace-pre-wrap text-muted">{item.text}</p>
            </li>
          ))
        )}
      </ol>
      {error ? (
      <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <label className="text-sm">
          Message
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={busy}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={background}
            onChange={(event) => setBackground(event.target.checked)}
          />
          Continue in background (queue the run, no live stream)
        </label>
        <button
          className="inline-flex h-11 w-fit items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={busy || !draft.trim()}
        >
          {busy ? "Running…" : "Send"}
        </button>
      </form>
      <p className="text-sm text-muted">
        <Link
          className="underline underline-offset-4"
          href={`/connectors?rentalId=${rentalId}`}
        >
          Konnektoren
        </Link>{" "}
        für diese Miete (Neon, GitHub, Slack, Vercel, Supabase, Render, Stripe,
        Cursor). Der Agent bekommt nur Tools für aktive Grants.
      </p>
    </div>
  );
}
