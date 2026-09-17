import type { Metadata } from "next";
import { ConnectorDiscoverSearch } from "@/components/connector-discover-search";
import { UpcomingConnectorPanel } from "@/components/connectors/upcoming-panel";
import { ButtonLink } from "@/components/ui/button-link";
import { PageShell } from "@/components/page-shell";
import { DISCOVERY_SOURCES } from "@/lib/connectors/discovery";
import { UPCOMING_CONNECTOR_LIST } from "@/lib/connectors";

export const metadata: Metadata = {
  title: "MCP entdecken",
  description:
    "Catalog-only Suche in der offiziellen MCP-Registry und GitHub-Topics. Nichts wird installiert oder gewährt.",
};

export default function ConnectorDiscoverPage() {
  return (
    <PageShell
      eyebrow="Konnektoren"
      title="MCP entdecken"
      description="Nur Katalogsuche. Runtime-Konnektoren bleiben die First-Party-Registry inklusive Higgsfield, LinkedIn, Meta und Google Search (Stubs, kein Fake-OAuth). Nichts hier ist grantable."
      actions={
        <ButtonLink href="/connectors" variant="secondary">
          Grants
        </ButtonLink>
      }
    >
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
        {DISCOVERY_SOURCES.map((source) => (
          <li key={source.id}>
            {source.name} — {source.notes}{" "}
            <a
              className="underline underline-offset-4"
              href={source.docs}
              rel="noreferrer"
              target="_blank"
            >
              Docs
            </a>
          </li>
        ))}
      </ul>
      <ConnectorDiscoverSearch />
      <UpcomingConnectorPanel items={UPCOMING_CONNECTOR_LIST} />
    </PageShell>
  );
}
