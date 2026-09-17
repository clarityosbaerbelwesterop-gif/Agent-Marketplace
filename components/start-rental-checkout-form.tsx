"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { formatMoney } from "@/lib/format";
import {
  startRentalCheckout,
  type CheckoutActionState,
} from "@/lib/runtime/actions";

export function StartRentalCheckoutForm({
  slug,
  durations,
  durationId,
  unpaidPreview = false,
}: {
  slug: string;
  durations: Array<{
    id: string;
    label: string;
    priceCents?: number;
    currency?: string;
  }>;
  durationId?: string;
  unpaidPreview?: boolean;
}) {
  const [state, action, pending] = useActionState(
    startRentalCheckout,
    null as CheckoutActionState,
  );
  const selectedId =
    durationId && durations.some((item) => item.id === durationId)
      ? durationId
      : durations[0]?.id;

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      {unpaidPreview ? null : durations.length > 0 && !durationId ? (
        <Field id="durationId" label="Mietdauer">
          <Select
            id="durationId"
            name="durationId"
            defaultValue={selectedId}
          >
            {durations.map((duration) => (
              <option key={duration.id} value={duration.id}>
                {duration.priceCents != null && duration.currency
                  ? `${duration.label} · ${formatMoney({
                      amountCents: duration.priceCents,
                      currency: duration.currency,
                    })}`
                  : duration.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : selectedId ? (
        <input type="hidden" name="durationId" value={selectedId} />
      ) : null}
      <p className="text-sm text-muted">
        {unpaidPreview
          ? "Staging: startet eine 1-Stunden-Vorschau ohne Stripe. Kein Zahlungsformular, kein Checkout."
          : "Weiter zu Stripe Checkout zum Katalogpreis. Zugang bleibt ausstehend, bis der Webhook die Zahlung bestätigt — der Erfolg-Redirect allein aktiviert die Miete nicht."}
      </p>
      {state?.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {unpaidPreview
          ? pending
            ? "Vorschau wird gestartet…"
            : "1-Stunden-Vorschau starten"
          : pending
            ? "Weiterleitung zu Stripe…"
            : "Weiter zu Stripe Checkout"}
      </Button>
    </form>
  );
}
