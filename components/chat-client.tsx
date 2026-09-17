"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentIdentityMark } from "@/components/agent/agent-meta-badges";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatStatusChips } from "@/components/chat/status-chips";
import { MessageList } from "@/components/chat/message-list";
import { Badge } from "@/components/ui/badge";
import { groundingChips } from "@/lib/chat/grounding";
import { consumeChatSse } from "@/lib/chat/sse";
import { agentTypeForCategory } from "@/lib/catalog/agent-types";
import { AGENT_TYPE_LABELS } from "@/lib/labels";
import { groupChatHref } from "@/lib/urls";
import type {
  FailoverPresentation,
  MemoryNetworkPresentation,
} from "@/lib/runtime/status";
import type { ChatMessage, ChatToolStep } from "@/types/chat";

type ChatRun = {
  id: string;
  status: string;
  modelIdUsed: string | null;
  skillVersion: string | null;
  input: { message?: unknown } | null;
  output: { text?: unknown; error?: unknown; agentName?: unknown } | null;
};

export type ChatGroupMember = {
  rentalId: string;
  agentName: string;
  agentSlug?: string;
  agentCategory?: string;
};

function slugForSpeaker(
  name: string | undefined,
  fallbackSlug: string | undefined,
  members: ChatGroupMember[],
): string | undefined {
  if (!name) {
    return fallbackSlug;
  }
  return members.find((member) => member.agentName === name)?.agentSlug ?? fallbackSlug;
}

function messagesFromRuns(
  runs: ChatRun[],
  agentName: string,
  agentSlug: string | undefined,
  members: ChatGroupMember[],
): ChatMessage[] {
  const items: ChatMessage[] = [];
  for (const run of runs) {
    const input = run.input?.message;
    if (typeof input === "string" && input.trim()) {
      const last = items[items.length - 1];
      if (!(last?.role === "user" && last.content === input)) {
        items.push({
          id: `${run.id}-user`,
          role: "user",
          content: input,
          createdAt: new Date().toISOString(),
          speaker: "Sie",
        });
      }
    }
    const output = run.output?.text;
    const error = run.output?.error;
    const speaker =
      typeof run.output?.agentName === "string" ? run.output.agentName : agentName;
    if (typeof output === "string" && output.trim()) {
      items.push({
        id: `${run.id}-assistant`,
        role: "agent",
        content: output,
        createdAt: new Date().toISOString(),
        speaker,
        speakerSlug: slugForSpeaker(speaker, agentSlug, members),
        modelId: run.modelIdUsed,
        grounding: groundingChips({ skillVersion: run.skillVersion }),
      });
    } else if (typeof error === "string" && error.trim()) {
      items.push({
        id: `${run.id}-error`,
        role: "system",
        content: error,
        createdAt: new Date().toISOString(),
        speaker: "System",
      });
    }
  }
  return items;
}

export function ChatClient({
  rentalId,
  sessionId,
  agentName,
  agentSlug,
  initialRuns,
  groupMembers = [],
  failover,
  memoryNetwork,
  groupEligible = false,
}: {
  rentalId: string | null;
  sessionId: string;
  agentName: string;
  agentSlug?: string;
  initialRuns: ChatRun[];
  groupMembers?: ChatGroupMember[];
  failover: FailoverPresentation;
  memoryNetwork: MemoryNetworkPresentation;
  groupEligible?: boolean;
}) {
  const [runs, setRuns] = useState(initialRuns);
  const [streaming, setStreaming] = useState("");
  const [working, setWorking] = useState(false);
  const [toolSteps, setToolSteps] = useState<ChatToolStep[]>([]);
  const [liveSkill, setLiveSkill] = useState<string | null>(
    initialRuns.at(-1)?.skillVersion ?? null,
  );
  const [streamingSpeaker, setStreamingSpeaker] = useState(agentName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modelId, setModelId] = useState<string | null>(
    initialRuns.at(-1)?.modelIdUsed ?? null,
  );
  const [provider, setProvider] = useState<string | null>(null);
  const isGroup = groupMembers.length > 0;

  const messages = useMemo(() => {
    const items = messagesFromRuns(runs, agentName, agentSlug, groupMembers);
    if (streaming || working) {
      items.push({
        id: "streaming",
        role: "agent",
        content: streaming,
        createdAt: new Date().toISOString(),
        speaker: streamingSpeaker,
        speakerSlug: slugForSpeaker(streamingSpeaker, agentSlug, groupMembers),
        streaming: Boolean(streaming),
        working,
        toolSteps,
        modelId,
      });
    }
    return items;
  }, [
    runs,
    streaming,
    working,
    toolSteps,
    agentName,
    agentSlug,
    modelId,
    groupMembers,
    streamingSpeaker,
  ]);

  async function send(message: string, background: boolean) {
    setBusy(true);
    setError(null);
    setStreaming("");
    setWorking(true);
    setToolSteps([]);
    setStreamingSpeaker(isGroup ? groupMembers[0]?.agentName ?? agentName : agentName);
    setRuns((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        status: "running",
        modelIdUsed: modelId,
        skillVersion: liveSkill,
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
        };
        if (!response.ok) {
          throw new Error(payload.error || "Chat-Anfrage fehlgeschlagen");
        }
        setError(
          payload.runId
            ? `Lauf ${payload.runId} läuft im Hintergrund. Aktualisieren Sie die Seite für das Ergebnis.`
            : "Hintergrundlauf in der Warteschlange. Aktualisieren Sie die Seite für das Ergebnis.",
        );
        setBusy(false);
        setWorking(false);
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Chat-Anfrage fehlgeschlagen");
      }

      let assembled = "";
      let runId: string | null = null;
      let usedModel: string | null = null;
      let skillVersion: string | null = liveSkill;
      const finished: ChatRun[] = [];

      await consumeChatSse(response, {
        onMeta: (event) => {
          runId = event.runId || runId;
          usedModel = event.modelId || usedModel;
          if (event.provider) {
            setProvider(event.provider);
          }
          if (event.skillVersion) {
            skillVersion = event.skillVersion;
            setLiveSkill(event.skillVersion);
          }
        },
        onDelta: (text) => {
          assembled += text;
          setStreaming(assembled);
          setWorking(false);
        },
        onTool: (event) => {
          if (event.agentName) {
            setStreamingSpeaker(event.agentName);
          }
          setWorking(true);
          setToolSteps((current) => {
            const next = [...current];
            const last = next.at(-1);
            if (event.status === "start" || last?.name !== event.name) {
              next.push({
                name: event.name,
                status: event.status,
                detail: event.detail,
              });
              return next;
            }
            next[next.length - 1] = {
              name: event.name,
              status: event.status,
              detail: event.detail,
            };
            return next;
          });
        },
        onDone: (event) => {
          assembled = event.outputText || assembled;
          usedModel = event.modelIdUsed || usedModel;
          if (event.providerUsed) {
            setProvider(event.providerUsed);
          }
          if (event.agentName) {
            setStreamingSpeaker(event.agentName);
          }
          finished.push({
            id: runId ?? `local-asst-${finished.length}`,
            status: assembled ? "succeeded" : "failed",
            modelIdUsed: usedModel,
            skillVersion,
            input: { message },
            output: assembled
              ? { text: assembled, agentName: event.agentName }
              : { error: "empty response" },
          });
          assembled = "";
          setStreaming("");
          setWorking(false);
          setToolSteps([]);
        },
        onError: (messageText) => {
          setError(messageText);
        },
      });

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
            skillVersion,
            input: { message },
            output: { text: assembled },
          });
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat fehlgeschlagen");
    } finally {
      setBusy(false);
      setStreaming("");
      setWorking(false);
      setToolSteps([]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ChatStatusChips failover={failover} memoryNetwork={memoryNetwork} />
      <p className="text-sm text-muted">
        {isGroup
          ? `Gruppensitzung mit ${groupMembers.map((member) => member.agentName).join(", ")}. Jede bezahlte Miete antwortet der Reihe nach.`
          : `Chat mit ${agentName}.`}{" "}
        Läufe bleiben in Postgres, auch wenn der Tab schließt.
        {modelId ? (
          <>
            {" "}
            Letztes Modell: <code className="font-mono text-xs">{modelId}</code>
            {provider ? (
              <>
                {" "}
                via <code className="font-mono text-xs">{provider}</code>
              </>
            ) : null}
          </>
        ) : null}
      </p>
      {isGroup ? (
        <ul className="flex flex-wrap gap-3" aria-label="Teilnehmende Agenten">
          {groupMembers.map((member) => {
            const agentType = member.agentCategory
              ? agentTypeForCategory(member.agentCategory)
              : null;
            return (
              <li
                key={member.rentalId}
                className="flex items-center gap-2 rounded-full border border-border bg-surface-raised px-2 py-1"
              >
                <AgentIdentityMark
                  agent={{
                    name: member.agentName,
                    slug: member.agentSlug ?? member.agentName,
                  }}
                  size="sm"
                />
                <span className="text-sm">{member.agentName}</span>
                {agentType ? (
                  <Badge tone="outline">{AGENT_TYPE_LABELS[agentType]}</Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {groupEligible && !isGroup ? (
        <p className="text-sm">
          <Link className="underline underline-offset-4" href={groupChatHref()}>
            Gruppenchat starten
          </Link>{" "}
          <span className="text-muted">
            — mehrere aktive Mieten im überlappenden Fenster.
          </span>
        </p>
      ) : null}
      <div className="max-h-[32rem] overflow-y-auto rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <MessageList
          messages={messages}
          emptyDescription={
            isGroup
              ? "Schreiben Sie eine Nachricht. Jede bezahlte Miete im Raum antwortet der Reihe nach."
              : undefined
          }
        />
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <ChatComposer
        disabled={false}
        busy={busy}
        onSend={send}
        submitLabel={isGroup ? "An alle senden" : "Senden"}
        busyLabel={isGroup ? "Agenten arbeiten…" : "Läuft…"}
        hint="SSE-Stream und Werkzeugschritte bleiben sichtbar, damit der Chat nicht hängt."
      />
      {rentalId ? (
        <p className="text-sm text-muted">
          <Link
            className="underline underline-offset-4"
            href={`/connectors?rentalId=${rentalId}`}
          >
            Konnektoren
          </Link>{" "}
          für diese Miete. Der Agent bekommt nur Tools für aktive Grants.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Konnektoren bleiben pro Miete. Öffnen Sie die Grant-Seite eines
          Mitglieds, um First-Party-Provider zu verbinden.
        </p>
      )}
    </div>
  );
}
