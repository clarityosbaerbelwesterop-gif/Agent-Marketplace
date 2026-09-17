"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  resumePendingCheckout,
  type CheckoutActionState,
} from "@/lib/runtime/actions";

export function ResumeCheckoutForm({ rentalId }: { rentalId: string }) {
  const [state, action, pending] = useActionState(
    resumePendingCheckout,
    null as CheckoutActionState,
  );

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <input type="hidden" name="rentalId" value={rentalId} />
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Weiterleitung zur Zahlung…" : "Zahlung fortsetzen"}
      </Button>
    </form>
  );
}
