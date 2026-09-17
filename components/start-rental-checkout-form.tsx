"use client";

import { useActionState } from "react";
import {
  startRentalCheckout,
  type CheckoutActionState,
} from "@/lib/runtime/actions";

const buttonClass =
  "rounded-md border border-foreground bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60";

export function StartRentalCheckoutForm({
  slug,
  durations,
}: {
  slug: string;
  durations: Array<{ id: string; label: string }>;
}) {
  const [state, action, pending] = useActionState(
    startRentalCheckout,
    null as CheckoutActionState,
  );

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      {durations.length > 0 ? (
        <label className="text-sm">
          Duration
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
        Continue to Stripe Checkout to pay. Access stays pending until the
        Stripe webhook confirms payment — the success redirect alone does not
        activate the rental.
      </p>
      {state?.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className={buttonClass} type="submit" disabled={pending}>
        {pending ? "Redirecting to Stripe…" : "Continue to Stripe Checkout"}
      </button>
    </form>
  );
}
