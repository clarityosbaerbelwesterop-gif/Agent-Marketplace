"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type RentalOption = { id: string; name: string; tier: string };

export function CreateRoomForm({ rentals }: { rentals: RentalOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("Gruppenraum");
  const [selected, setSelected] = useState<string[]>(
    rentals.slice(0, 2).map((row) => row.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, rentalIds: selected }),
      });
      const payload = (await response.json()) as { error?: string; id?: string };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error || "Raum konnte nicht angelegt werden");
      }
      router.push(`/rooms/${payload.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Raum fehlgeschlagen");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
      <Field id="room-title" label="Titel">
        <Input
          id="room-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Aktive Mieten</legend>
        {rentals.map((row) => (
          <label key={row.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(row.id)}
              onChange={() => toggle(row.id)}
            />
            {row.name} · {row.tier}
          </label>
        ))}
      </fieldset>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={busy || selected.length < 2}>
        {busy ? "Anlegen…" : "Raum anlegen"}
      </Button>
    </form>
  );
}
