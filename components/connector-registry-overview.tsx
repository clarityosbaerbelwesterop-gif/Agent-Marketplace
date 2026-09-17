import { partitionConnectorCatalog } from "@/lib/connectors";
import type { ConnectorCatalogItem } from "@/lib/connectors";
import { connectorUiDescription, connectorUiName } from "@/lib/labels";

export function ConnectorRegistryOverview({
  items,
}: {
  items: ConnectorCatalogItem[];
}) {
  const { firstWave, stubs } = partitionConnectorCatalog(items);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight">First-Wave</h2>
          <p className="mt-1 text-sm text-muted">
            First-Wave-Konnektoren sind requestable, sobald eine aktive Miete
            existiert (bezahlt oder Staging unpaid_test). OAuth bleibt
            ausstehend, bis der Anbieter ein Token liefert; API-Keys bleiben
            pending, bis Tenant-Secrets gespeichert sind.
          </p>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {firstWave.map((item) => (
            <li
              key={item.id}
              className="rounded-[var(--radius-md)] border border-border bg-surface-raised p-4 shadow-card"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-medium">
                  {connectorUiName(item.id, item.displayName)}
                </h3>
                <span className="text-xs text-muted">grantable</span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {connectorUiDescription(item.id, item.description)}
              </p>
              <p className="mt-2 text-xs text-muted">
                {item.authKind}
                {item.oauth ? ` · ${item.oauth.callbackPath}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight">Grant-Stubs</h2>
          <p className="mt-1 text-sm text-muted">
            Zweite Welle: Katalog-Stubs. Kein Fake-OAuth. Tenant-Secrets können
            später hinterlegt werden; bis dahin bleibt der Grant pending.
          </p>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {stubs.map((item) => (
            <li
              key={item.id}
              className="rounded-[var(--radius-md)] border border-border bg-surface-raised p-4 shadow-card"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-medium">
                  {connectorUiName(item.id, item.displayName)}
                </h3>
                <span className="text-xs text-muted">stub</span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {connectorUiDescription(item.id, item.description)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
