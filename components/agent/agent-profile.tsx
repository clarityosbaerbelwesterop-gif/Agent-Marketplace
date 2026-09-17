import { AgentIdentityMark, AgentMetaBadges } from "@/components/agent/agent-meta-badges";
import { DurationOptions } from "@/components/agent/duration-options";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StartRentalCheckoutForm } from "@/components/start-rental-checkout-form";
import { mergeAgentAndSupportedConnectors } from "@/lib/connectors";
import { formatMoney } from "@/lib/format";
import { formatUsage, isUntested, listDurations, pickDuration } from "@/lib/ui/agent-presentation";
import { TIER_LABELS } from "@/lib/labels";
import { MAX_COMPARE_SLUGS } from "@/lib/catalog/constants";
import { agentHref, checkoutHref, compareHref, marketplaceHref } from "@/lib/urls";
import type { AgentDetail } from "@/lib/catalog/types";

export function AgentProfile({
  agent,
  durationId,
  compare,
  signedIn,
  unpaidAccess = false,
}: {
  agent: AgentDetail;
  durationId?: string;
  compare: string[];
  signedIn: boolean;
  unpaidAccess?: boolean;
}) {
  const durations = listDurations(agent);
  const duration = pickDuration(agent, durationId);
  const alreadyCompared = compare.includes(agent.slug);
  const nextCompare = alreadyCompared
    ? compare
    : [...compare, agent.slug].slice(0, MAX_COMPARE_SLUGS);
  const permissionTools = agent.permissions.tools ?? [];
  const connectors = mergeAgentAndSupportedConnectors(agent.connectors ?? []);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.9fr)]">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <AgentIdentityMark agent={agent} size="lg" />
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                {agent.slug}
              </p>
              <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
                {agent.name}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted">
                {agent.tagline ?? agent.description}
              </p>
              <AgentMetaBadges agent={agent} />
            </div>
          </div>
          {isUntested(agent) ? (
            <div className="rounded-md border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning">
              Ungeprüft: `rating_status` ist untested. Keine Benchmarks, keine
              Erfolgsquote.
            </div>
          ) : null}
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl tracking-tight">Beschreibung</h2>
          <p className="max-w-2xl text-base leading-relaxed">{agent.description}</p>
        </section>

        {agent.specializations.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl tracking-tight">Spezialisierungen</h2>
            <ul className="flex flex-wrap gap-2">
              {agent.specializations.map((item) => (
                <li key={item}>
                  <Badge tone="outline">{item}</Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {agent.skills.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="font-display text-2xl tracking-tight">Fähigkeitspaket</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {agent.skills.map((skill) => (
                <li
                  key={skill.id}
                  className="rounded-[var(--radius-md)] border border-border bg-surface p-4"
                >
                  <p className="font-mono text-xs">
                    {skill.slug}@{skill.version}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {skill.instructions}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl tracking-tight">Konnektoren</h2>
            <p className="text-sm text-muted">
              First-Wave-Grants während einer Miete: Neon, GitHub, Slack, Vercel,
              Supabase, Render, Stripe, Cursor. OAuth/API-Keys sind Tenant-Grants —
              nicht Marketplace-Checkout und nicht live, bis konfiguriert.
            </p>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
              {connectors.map((connector) => (
                <li key={connector.provider}>
                  {connector.provider}
                  {connector.required ? " (erforderlich)" : ""}
                  {connector.scopes?.length
                    ? ` · ${connector.scopes.join(", ")}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl tracking-tight">Berechtigungen</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
              <li>Netzwerk: {agent.permissions.network ?? "nicht angegeben"}</li>
              <li>Dateien: {agent.permissions.files ?? "nicht angegeben"}</li>
              {permissionTools.map((tool) => (
                <li key={tool}>{tool}</li>
              ))}
            </ul>
            <p className="text-sm text-muted">
              Sprachen: {agent.languages.join(", ") || "—"}
            </p>
            <p className="text-sm text-muted">
              Modellalias der Stufe {TIER_LABELS[agent.tier]}:{" "}
              <span className="font-medium text-foreground">
                {agent.modelAlias ?? agent.tier}
              </span>
              . Routing über UNOROUTER, keine frei erfundenen Modell-IDs in der UI.
            </p>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="flex flex-col gap-5">
          <CardHeader>
            <CardTitle>Miete</CardTitle>
            <p className="text-sm text-muted">
              {unpaidAccess
                ? "Preis und inkludiertes Kontingent aus `rental_options`. Testmodus: sofort aktive Miete ohne Stripe und ohne Kartenformular."
                : "Preis und inkludiertes Kontingent aus `rental_options`. Zahlung über Stripe Checkout; Aktivierung nur per Webhook."}
            </p>
          </CardHeader>
          <DurationOptions
            durations={durations}
            selectedId={duration?.id}
            hrefFor={(id) => agentHref(agent.slug, id)}
          />
          {duration ? (
            <div className="flex flex-col gap-1 border-t border-border pt-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">
                Summe
              </p>
              <p className="tabular font-display text-3xl">
                {formatMoney({
                  amountCents: duration.priceCents,
                  currency: duration.currency,
                })}
              </p>
              <p className="text-sm text-muted">{formatUsage(agent, duration)}</p>
            </div>
          ) : null}
          <ButtonLink href={checkoutHref(agent.slug, duration?.id)} variant="secondary">
            Preis prüfen
          </ButtonLink>
          {signedIn ? (
            <StartRentalCheckoutForm
              slug={agent.slug}
              durations={durations.map((item) => ({
                id: item.id,
                label: item.label,
                priceCents: item.priceCents,
                currency: item.currency,
              }))}
              durationId={duration?.id}
              unpaidAccess={unpaidAccess}
            />
          ) : (
            <p className="text-sm text-muted">
              <ButtonLink href="/login" variant="ghost" size="sm">
                Anmelden
              </ButtonLink>{" "}
              {unpaidAccess ? "für eine Testmiete." : "für Stripe Checkout."}
            </p>
          )}
          <div className="flex flex-col gap-2 text-sm">
            <ButtonLink
              href={marketplaceHref({ compare: nextCompare })}
              variant="secondary"
            >
              {alreadyCompared ? "Im Vergleich" : "Zum Vergleich"}
            </ButtonLink>
            {nextCompare.length > 0 ? (
              <ButtonLink href={compareHref(nextCompare)} variant="ghost">
                Vergleich öffnen
              </ButtonLink>
            ) : null}
          </div>
        </Card>
      </aside>
    </div>
  );
}
