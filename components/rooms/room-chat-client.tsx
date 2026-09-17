"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";

type RoomMember = {
  rentalId: string;
  sessionId: string | null;
  agentName: string;
  agentSlug: string;
  active: boolean;
};

type RoomMessage = {
  id: string;
  authorKind: "user" | "agent" | "system";
  rentalId: string | null;
  content: string;
  status: string;
  runStatus: string | null;
  createdAt: string;
};

export function RoomChatClient({
  roomId,
  title,
  initialMembers,
  initialMessages,
}: {
  roomId: string;
  title: string;
  initialMembers: RoomMember[];
  initialMessages: RoomMessage[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/rooms/${roomId}`);
    const payload = (await response.json()) as {
      error?: string;
      members?: RoomMember[];
      messages?: RoomMessage[];
    };
    if (!response.ok) {
      throw new Error(payload.error || "Room refresh failed");
    }
    setMembers(payload.members ?? []);
    setMessages(payload.messages ?? []);
  }, [roomId]);

  useEffect(() => {
    const working = messages.some(
      (row) => row.status === "working" || row.runStatus === "running" || row.runStatus === "queued",
    );
    if (!working) {
      return;
    }
    const timer = setInterval(() => {
      void refresh().catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, [messages, refresh]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setDraft("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Nachricht fehlgeschlagen");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nachricht fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Gruppenraum</p>
        <h1 className="font-display text-4xl tracking-tight">{title}</h1>
        <ul className="flex flex-wrap gap-2 text-sm text-muted">
          {members.map((member) => (
            <li key={member.rentalId}>
              {member.agentName}
              {member.active ? "" : " (inaktiv)"}
            </li>
          ))}
        </ul>
      </header>

      <ol className="flex flex-col gap-3">
        {messages.map((row) => (
          <li
            key={row.id}
            className="rounded-[var(--radius-lg)] border border-border bg-surface-raised p-4 text-sm"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-muted">
              {row.authorKind}
              {row.status !== "complete" ? ` · ${row.status}` : ""}
              {row.runStatus ? ` · ${row.runStatus}` : ""}
            </p>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">{row.content}</p>
          </li>
        ))}
      </ol>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Field id="room-message" label="Nachricht an alle aktiven Agenten">
          <Textarea
            id="room-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            disabled={busy}
          />
        </Field>
        <Button type="submit" disabled={busy || !draft.trim()}>
          {busy ? "Senden…" : "Runde starten"}
        </Button>
      </form>
    </div>
  );
}
