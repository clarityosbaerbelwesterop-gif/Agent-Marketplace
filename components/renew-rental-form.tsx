"use client";

import { useActionState } from "react";
import {
  startRentalRenewal,
  type CheckoutActionState,
} from "@/lib/runtime/actions";

const buttonClass =
  "rounded-md border border-border px-3 py-2 text-sm font-medium disabled:opacity-60";

export function RenewRentalForm({
  rentalId,
  durations,
}: {
  rentalId: string;
  durations: Array<{ id: string; label: string }>;
}) {
  const [state, action, pending] = useActionState(
    startRentalRenewal,
    null as CheckoutActionState,
  );

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <input type="hidden" name="rentalId" value={rentalId} />
      {durations.length > 0 ? (
        <label className="text-sm">
          Renewal duration
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            name="durationId"
            defaultValue={durations[0]?.id}
          >
            {durations.map((duration) => (
              <option key={duration.id} value={duration.id}>
                {duration.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className="text-sm text-muted">
        Renewal extends <code className="font-mono text-xs">ends_at</code> and
        usage only after Stripe confirms payment.
      </p>
      {state?.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className={buttonClass} type="submit" disabled={pending}>
        {pending ? "Redirecting to Stripe…" : "Renew with Stripe"}
      </button>
    </form>
  );
}
