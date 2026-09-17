"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

type ChatRun = {
  id: string;
  status: string;
  modelIdUsed: string | null;
  skillVersion: string | null;
  input: { message?: unknown } | null;
  output: { text?: unknown; error?: unknown; agentName?: unknown } | null;
};

type ChatMessageView = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  agentName?: string;
};

function messagesFromRuns(runs: ChatRun[]): ChatMessageView[] {
  const items: ChatMessageView[] = [];
  for (const run of runs) {
    const input = run.input?.message;
    if (typeof input === "string" && input.trim()) {
      const last = items[items.length - 1];
      if (!(last?.role === "user" && last.text === input)) {
        items.push({ id: `${run.id}-user`, role: "user", text: input });
      }
    }
    const output = run.output?.text;
    const error = run.output?.error;
    const agentName =
      typeof run.output?.agentName === "string" ? run.output.agentName : undefined;
    if (typeof output === "string" && output.trim()) {
      items.push({
        id: `${run.id}-assistant`,
        role: "assistant",
        text: output,
        agentName,
      });
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
  groupMembers = [],
}: {
  rentalId: string | null;
  sessionId: string;
  agentName: string;
  initialRuns: ChatRun[];
  groupMembers?: Array<{ rentalId: string; agentName: string }>;
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
  const [provider, setProvider] = useState<string | null>(null);
  const isGroup = groupMembers.length > 0;

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
          rentalId: rentalId ?? undefined,
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
      const finished: ChatRun[] = [];

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
          provider?: string;
          providerUsed?: string;
          outputText?: string;
          agentName?: string;
          downgradedFromPaid?: boolean;
        };
        if (eventName === "meta" || data.type === "meta") {
          runId = data.runId ?? runId;
          usedModel = data.modelId ?? usedModel;
          if (data.provider) {
            setProvider(data.provider);
          }
        }
        if (eventName === "delta" || data.type === "delta") {
          assembled += data.text ?? "";
          setStreaming(assembled);
        }
        if (eventName === "done" || data.type === "done") {
          assembled = data.outputText || assembled;
          usedModel = data.modelIdUsed ?? usedModel;
          if (data.providerUsed) {
            setProvider(data.providerUsed);
          }
          finished.push({
            id: runId ?? `local-asst-${finished.length}`,
            status: assembled ? "succeeded" : "failed",
            modelIdUsed: usedModel,
            skillVersion: null,
            input: { message },
            output: assembled
              ? { text: assembled, agentName: data.agentName }
              : { error: "empty response" },
          });
          assembled = "";
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
        next.push({
          id: `local-user-${Date.now()}`,
          status: "succeeded",
          modelIdUsed: usedModel,
          skillVersion: null,
          input: { message },
          output: null,
        });
        if (finished.length > 0) {
          next.push(...finished);
        } else if (assembled) {
          next.push({
            id: runId ?? `local-asst-${Date.now()}`,
            status: "succeeded",
            modelIdUsed: usedModel,
            skillVersion: null,
            input: { message },
            output: { text: assembled },
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
        {isGroup
          ? `Gruppensitzung mit ${groupMembers.map((member) => member.agentName).join(", ")}. Jede bezahlte Miete antwortet der Reihe nach.`
          : `Chat mit ${agentName}.`}{" "}
        Runs bleiben in Postgres, damit die Arbeit nach dem Tab-Close weiterlaufen kann.
        {modelId ? (
          <>
            {" "}
            Last model: <code className="font-mono text-xs">{modelId}</code>
            {provider ? (
              <>
                {" "}
                via <code className="font-mono text-xs">{provider}</code>
              </>
            ) : null}
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
                  ? "Sie"
                  : item.role === "system"
                    ? "System"
                    : item.agentName ?? agentName}
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
      {rentalId ? (
        <p className="text-sm text-muted">
          <Link
            className="underline underline-offset-4"
            href={`/connectors?rentalId=${rentalId}`}
          >
            Konnektoren
          </Link>{" "}
          für diese Miete (Neon, GitHub, Slack, Vercel, Supabase, Render, Stripe,
          Cursor, Higgsfield, LinkedIn, Meta, Google Search). Der Agent bekommt
          nur Tools für aktive Grants.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Konnektoren bleiben pro Miete. Öffnen Sie die Grant-Seite eines
          Mitglieds, um Higgsfield, LinkedIn, Meta, Google Search oder die
          übrigen First-Wave-Provider zu verbinden.
        </p>
      )}
    </div>
  );
}
