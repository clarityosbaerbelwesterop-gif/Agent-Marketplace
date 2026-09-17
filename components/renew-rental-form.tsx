"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import {
  startRentalRenewal,
  type CheckoutActionState,
} from "@/lib/runtime/actions";

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
        <Field id="renewal-duration" label="Verlängerung">
          <Select
            id="renewal-duration"
            name="durationId"
            defaultValue={durations[0]?.id}
          >
            {durations.map((duration) => (
              <option key={duration.id} value={duration.id}>
                {duration.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <p className="text-sm text-muted">
        Verlängerung setzt <code className="font-mono text-xs">ends_at</code> und
        das Kontingent erst nach Zahlungsbestätigung.
      </p>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Weiterleitung zur Zahlung…" : "Miete verlängern"}
      </Button>
    </form>
  );
}
