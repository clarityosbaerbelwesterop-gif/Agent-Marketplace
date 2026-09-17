"use client";

import { useActionState } from "react";
import {
  resumePendingCheckout,
  type CheckoutActionState,
} from "@/lib/runtime/actions";

const buttonClass =
  "rounded-md border border-foreground bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60";

export function ResumeCheckoutForm({ rentalId }: { rentalId: string }) {
  const [state, action, pending] = useActionState(
    resumePendingCheckout,
    null as CheckoutActionState,
  );

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <input type="hidden" name="rentalId" value={rentalId} />
      {state?.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className={buttonClass} type="submit" disabled={pending}>
        {pending ? "Redirecting to Stripe…" : "Resume Stripe Checkout"}
      </button>
    </form>
  );
}
