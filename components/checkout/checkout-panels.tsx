import { AgentIdentityMark } from "@/components/agent/agent-meta-badges";
import { DurationOptions } from "@/components/agent/duration-options";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StartRentalCheckoutForm } from "@/components/start-rental-checkout-form";
import { formatMoney } from "@/lib/format";
import { TIER_LABELS } from "@/lib/labels";
import { checkoutHref } from "@/lib/urls";
import { formatUsage, listDurations, pickDuration } from "@/lib/ui/agent-presentation";
import type { AgentDetail } from "@/lib/catalog/types";

export function CheckoutSummary({
  agent,
  durationId,
  unpaidAccess = false,
}: {
  agent: AgentDetail;
  durationId?: string;
  unpaidAccess?: boolean;
}) {
  const duration = pickDuration(agent, durationId);
  const durations = listDurations(agent);

  return (
    <Card className="flex flex-col gap-5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AgentIdentityMark agent={agent} />
          <div>
            <CardTitle>{agent.name}</CardTitle>
            <p className="text-sm text-muted">
              {TIER_LABELS[agent.tier]} · Alias {agent.modelAlias ?? agent.tier}
            </p>
          </div>
        </div>
      </CardHeader>
      <DurationOptions
        durations={durations}
        selectedId={duration?.id}
        hrefFor={(id) => checkoutHref(agent.slug, id)}
      />
      {duration ? (
        <dl className="grid gap-3 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Dauer</dt>
            <dd>{duration.label}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Inklusive Nutzung</dt>
            <dd className="text-right">{formatUsage(agent, duration)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-medium">
            <dt>Zwischensumme</dt>
            <dd className="tabular">
              {formatMoney({
                amountCents: duration.priceCents,
                currency: duration.currency,
              })}
            </dd>
          </div>
        </dl>
      ) : null}
      <p className="text-xs leading-relaxed text-muted">
        {unpaidAccess
          ? "MARKETPLACE_ALLOW_UNPAID_ACCESS: sofort aktive Testmiete ohne Checkout Session und ohne Karten-UI."
          : "Hosted Stripe Checkout (`mode=payment`). Die Miete bleibt `pending`, bis der signierte Webhook bestätigt — nicht durch diese Seite."}
      </p>
    </Card>
  );
}

export function CheckoutPayPanel({
  agent,
  durationId,
  signedIn,
  unpaidAccess = false,
}: {
  agent: AgentDetail;
  durationId?: string;
  signedIn: boolean;
  unpaidAccess?: boolean;
}) {
  const durations = listDurations(agent);

  return (
    <Card className="flex flex-col gap-5">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Zahlung</CardTitle>
          <Badge tone="outline">
            {unpaidAccess ? "Testmodus" : "Stripe Checkout"}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          {unpaidAccess
            ? "Kein Stripe und kein Kartenformular. Live-Test vor der Stripe-Anbindung."
            : "Kein Kartenformular auf dieser Seite. Stripe hostet die Zahlung."}
        </p>
      </CardHeader>
      {signedIn ? (
        <StartRentalCheckoutForm
          slug={agent.slug}
          durations={durations.map((item) => ({
            id: item.id,
            label: item.label,
            priceCents: item.priceCents,
            currency: item.currency,
          }))}
          durationId={durationId}
          unpaidAccess={unpaidAccess}
        />
      ) : (
        <p className="text-sm text-muted">
          <ButtonLink href="/login" variant="secondary" size="sm">
            Anmelden
          </ButtonLink>{" "}
          {unpaidAccess
            ? "um eine Testmiete zu starten."
            : "um mit Stripe zu bezahlen."}
        </p>
      )}
    </Card>
  );
}
