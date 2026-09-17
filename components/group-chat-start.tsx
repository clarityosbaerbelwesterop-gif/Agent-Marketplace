"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { chatSessionHref } from "@/lib/urls";

type ActiveRental = {
  id: string;
  agentName: string;
  agentTier: string;
};

export function GroupChatStart({ rentals }: { rentals: ActiveRental[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length >= 4
          ? current
          : [...current, id],
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (selected.length < 2 || busy) {
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
  }

  if (rentals.length < 2) {
    return null;
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4"
      onSubmit={onSubmit}
    >
      <p className="text-sm font-medium">Gruppenchat</p>
      <p className="text-sm text-muted">
        Wählen Sie zwei oder mehr aktive bezahlte Mieten. Nur diese Agenten
        arbeiten für das verbleibende Mietfenster zusammen. Der Raum schließt,
        wenn zu wenige bezahlte Mitglieder übrig sind.
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {rentals.map((rental) => (
          <li key={rental.id}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(rental.id)}
                onChange={() => toggle(rental.id)}
              />
              {rental.agentName}
              <span className="text-muted">· {rental.agentTier}</span>
            </label>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={busy || selected.length < 2}
        className="w-fit"
      >
        {busy ? "Öffnen…" : "Gruppensitzung starten"}
      </Button>
    </form>
  );
}
