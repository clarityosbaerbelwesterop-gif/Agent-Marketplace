"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EndRentalForm({ rentalId }: { rentalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onEnd() {
    if (busy) {
      return;
    }
    if (!window.confirm("End this rental? Chat and queued runs will stop.")) {
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
        throw new Error(payload.error || "Could not end rental");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end rental");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">
        Ending closes this rental, open chat sessions, and queued or running
        jobs. Chat will reject further turns.
      </p>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="w-fit rounded-md border border-border px-3 py-2 text-sm font-medium disabled:opacity-60"
        type="button"
        onClick={() => void onEnd()}
        disabled={busy}
      >
        {busy ? "Ending…" : "End rental"}
      </button>
    </div>
  );
}
