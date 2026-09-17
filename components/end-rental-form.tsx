"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function EndRentalForm({ rentalId }: { rentalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onEnd() {
    if (busy) {
      return;
    }
    if (!window.confirm("Miete beenden? Chat und laufende Jobs stoppen.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rentals/${rentalId}/end`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "user_ended" }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Miete konnte nicht beendet werden");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Miete konnte nicht beendet werden",
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">
        Beenden schließt diese Miete, offene Chat-Sitzungen und queued/running
        Jobs. Weitere Turns werden abgelehnt.
      </p>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => void onEnd()}
        disabled={busy}
      >
        {busy ? "Beende…" : "Miete beenden"}
      </Button>
    </div>
  );
}
