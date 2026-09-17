"use client";

import { useMemo, useState } from "react";
import { AgentIdentityMark } from "@/components/agent/agent-meta-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AGENT_TYPE_LABELS, type AgentType } from "@/lib/catalog/agent-types";
import { overlappingRentalWindow } from "@/lib/runtime/group-window";
import { chatSessionHref } from "@/lib/urls";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const MAX_GROUP_MEMBERS = 4;

export function GroupChatPicker({
  candidates,
  initiallySelected = [],
}: {
  candidates: Array<{
    rentalId: string;
    agentName: string;
    agentSlug: string;
    agentType: AgentType | null;
    endsAt: string | null;
    startsAt: string | null;
  }>;
  initiallySelected?: string[];
}) {
  const router = useRouter();
  const allowed = new Set(candidates.map((row) => row.rentalId));
  const [selected, setSelected] = useState<string[]>(
    initiallySelected.filter((id) => allowed.has(id)).slice(0, MAX_GROUP_MEMBERS),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      if (current.length >= MAX_GROUP_MEMBERS) {
        return current;
      }
      return [...current, id];
    });
  }

  const selectedRows = useMemo(
    () =>
      candidates
        .filter((row) => selected.includes(row.rentalId))
        .map((row) => ({
          startsAt: row.startsAt ?? null,
          endsAt: row.endsAt,
        })),
    [candidates, selected],
  );
  const overlap = overlappingRentalWindow(selectedRows);
  const ready = selected.length >= 2 && overlap.ok;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!ready || busy) {
          return;
        }
        setBusy(true);
        setError(null);
        try {
          const response = await fetch("/api/sessions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ kind: "group", rentalIds: selected }),
          });
          const payload = (await response.json()) as {
            error?: string;
            session?: { id?: string };
          };
          if (!response.ok) {
            throw new Error(payload.error || "Gruppensitzung konnte nicht geöffnet werden");
          }
          if (!payload.session?.id) {
            throw new Error("Sitzungs-ID fehlt");
          }
          router.push(chatSessionHref(payload.session.id));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Gruppensitzung fehlgeschlagen");
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-muted">
        Wählen Sie mindestens zwei aktive Mieten (Coding, Marketing, Design,
        Sales). Das Gruppenfenster ist die Schnittmenge der bezahlten Laufzeiten.
        Höchstens {MAX_GROUP_MEMBERS} Agenten.
      </p>
      <ul className="flex flex-col gap-2">
        {candidates.map((row) => {
          const checked = selected.includes(row.rentalId);
          return (
            <li key={row.rentalId}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-raised px-4 py-3",
                  checked && "ring-2 ring-ring",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(row.rentalId)}
                />
                <AgentIdentityMark
                  agent={{ name: row.agentName, slug: row.agentSlug }}
                  size="sm"
                />
                <span className="flex-1 text-sm font-medium">{row.agentName}</span>
                {row.agentType ? (
                  <Badge tone="outline">{AGENT_TYPE_LABELS[row.agentType]}</Badge>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
      {selected.length >= 2 && !overlap.ok ? (
        <p className="text-sm text-danger" role="alert">
          {overlap.reason === "expired"
            ? "Das überlappende Mietfenster ist abgelaufen."
            : "Diese Mieten haben kein gemeinsames Zeitfenster."}
        </p>
      ) : null}
      {overlap.ok ? (
        <p className="text-sm text-muted">
          Überlappendes Fenster: {overlap.startsAt.toLocaleString("de-DE")} –{" "}
          {overlap.endsAt.toLocaleString("de-DE")}.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={!ready || busy}>
        {busy ? "Öffnen…" : "Gruppensitzung starten"}
      </Button>
    </form>
  );
}
