import type { Metadata } from "next";
import { ConnectorPanel } from "@/components/connector-panel";
import { UpcomingConnectorPanel } from "@/components/connectors/upcoming-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button-link";
import { PageShell } from "@/components/page-shell";
import { getVerifiedSession } from "@/lib/auth/server";
import { isDatabaseConfigured } from "@/lib/catalog/queries";
import { connectorCatalog, listConnectorGrants, UPCOMING_CONNECTOR_LIST } from "@/lib/connectors";
import {
  getRentalForUser,
  listRentals,
  rentalIsActive,
} from "@/lib/runtime/rentals";
import { chatRentalHref, rentalCheckoutHref } from "@/lib/urls";
import { firstSearchParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Konnektoren",
  description:
    "Tenant-Grants für eine aktive Miete. OAuth und API-Keys sind keine Marketplace-Zahlung.",
};

export const dynamic = "force-dynamic";

export default async function ConnectorsPage({
  searchParams,
}: PageProps<"/connectors">) {
  const params = await searchParams;
  const rentalId = firstSearchParam(params.rentalId);
  const connected = firstSearchParam(params.connected);
  const error = firstSearchParam(params.error);
  const session = await getVerifiedSession();

  if (!session?.user) {
    return (
      <PageShell
        title="Konnektoren"
        description="Melden Sie sich an, um Konnektoren während einer Miete freizugeben. Ausstehende Freigaben bleiben pending, bis Zugangsdaten oder OAuth vorliegen."
      >
        <EmptyState
          title="Anmeldung nötig"
          description="Grants hängen an einer verifizierten Sitzung."
          actionHref="/login"
          actionLabel="Anmelden"
        />
        <p className="text-sm text-muted">
          Catalog-only MCP-Suche (keine Grants):{" "}
          <ButtonLink href="/connectors/discover" variant="ghost" size="sm">
            Entdecken
          </ButtonLink>
        </p>
      </PageShell>
    );
  }

  if (!isDatabaseConfigured()) {
    return (
      <PageShell
        title="Konnektoren"
        description="Ohne DATABASE_URL gibt es keine Grant-Zeilen."
      />
    );
  }

  if (!rentalId) {
    const rentals = await listRentals(session.user.id);
    const active = rentals.filter((row) =>
      rentalIsActive({
        status: row.status,
        startsAt: row.startsAt ? new Date(row.startsAt) : null,
        endsAt: row.endsAt ? new Date(row.endsAt) : null,
      }),
    );
    const pending = rentals.filter((row) => row.status === "pending");
    return (
      <PageShell
        title="Konnektoren"
        description="Wählen Sie eine per Webhook aktivierte Miete. Grants liegen pro User und Workspace. Öffentliche MCP-Suche unter /connectors/discover ist nicht grantable."
      >
        {active.length === 0 ? (
          <EmptyState
            title="Keine aktive Miete"
            description="Bezahlen Sie auf einem Agentenprofil. Ausstehende Checkouts schalten keine Konnektoren frei."
            actionHref="/marketplace"
            actionLabel="Marktplatz öffnen"
          />
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {active.map((row) => (
              <li key={row.id}>
                <ButtonLink
                  href={`/connectors?rentalId=${row.id}`}
                  variant="secondary"
                >
                  {row.agentName}
                </ButtonLink>
                <span className="ml-2 text-muted">· {row.agentTier}</span>
              </li>
            ))}
          </ul>
        )}
        {pending.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">
              Warten auf Zahlungsbestätigung (Zahlung fortsetzen; die Miete
              wird erst nach Bestätigung aktiv):
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {pending.map((row) => (
                <li key={row.id}>
                  <ButtonLink
                    href={rentalCheckoutHref(row.id)}
                    variant="ghost"
                    size="sm"
                  >
                    {row.agentName}
                  </ButtonLink>
                  <span className="text-muted"> · pending</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <UpcomingConnectorPanel items={UPCOMING_CONNECTOR_LIST} />
      </PageShell>
    );
  }

  const bundle = await getRentalForUser(session.user.id, rentalId);
  if (!bundle) {
    return (
      <PageShell title="Konnektoren" description="Diese Miete fehlt.">
        <ButtonLink href="/connectors" variant="secondary">
          Andere Miete wählen
        </ButtonLink>
      </PageShell>
    );
  }
  if (bundle.rental.status === "pending") {
    return (
      <PageShell
        title="Konnektoren"
        description="Diese Miete wartet noch auf die Zahlung. Konnektoren öffnen erst, wenn die Miete aktiv ist."
      >
        <ButtonLink href={rentalCheckoutHref(rentalId)} variant="secondary">
          Checkout fortsetzen
        </ButtonLink>
      </PageShell>
    );
  }
  if (!rentalIsActive(bundle.rental)) {
    return (
      <PageShell
        title="Konnektoren"
        description="Diese Miete ist nicht mehr aktiv."
      >
        <ButtonLink href="/connectors" variant="ghost">
          Andere Miete wählen
        </ButtonLink>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Konnektoren"
      description={`Tenant-Grants für ${bundle.agent.name}. OAuth bleibt ausstehend, bis der Anbieter ein Token liefert. API-Key-Konnektoren bleiben pending, bis Secrets gespeichert sind.`}
    >
      {connected ? (
        <p className="text-sm">{connected} verbunden.</p>
      ) : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-muted">
        Zurück zum{" "}
        <ButtonLink href={chatRentalHref(rentalId)} variant="ghost" size="sm">
          Chat
        </ButtonLink>
      </p>
      <ConnectorPanel
        rentalId={rentalId}
        items={connectorCatalog(
          await listConnectorGrants(session.user.id, bundle.rental.workspaceId),
        )}
      />
      <UpcomingConnectorPanel items={UPCOMING_CONNECTOR_LIST} />
    </PageShell>
  );
}
