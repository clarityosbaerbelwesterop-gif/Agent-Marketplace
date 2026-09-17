import type { Metadata } from "next";
import { CompareTable } from "@/components/compare/compare-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import {
  compareAgents,
  isDatabaseConfigured,
  parseCompareSlugs,
} from "@/lib/catalog";
import { firstSearchParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Vergleich",
  description: "Bis zu vier Agenten nebeneinander aus dem Catalog API.",
};

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: PageProps<"/compare">) {
  const params = await searchParams;
  const durationId = firstSearchParam(params.duration);
  const parsed = parseCompareSlugs(params);

  if (!isDatabaseConfigured()) {
    return (
      <PageShell title="Vergleich" description="Katalogdatenbank fehlt." />
    );
  }

  if ("error" in parsed) {
    return (
      <PageShell
        width="wide"
        eyebrow="Vergleich"
        title="Seite an Seite"
        description={parsed.error}
        actions={
          <ButtonLink href="/marketplace" variant="secondary">
            Marktplatz
          </ButtonLink>
        }
      >
        <EmptyState
          title="Keine Profile ausgewählt"
          description="Markieren Sie bis zu vier Agenten auf dem Marktplatz. Query: /compare?slugs=a,b,c"
          actionHref="/marketplace"
          actionLabel="Agenten wählen"
        />
      </PageShell>
    );
  }

  const result = await compareAgents(parsed.slugs);

  return (
    <PageShell
      width="wide"
      eyebrow="Vergleich"
      title="Seite an Seite"
      description="Katalogfelder über GET /api/agents/compare. Keine erfundenen Benchmarks."
      actions={
        <ButtonLink href="/marketplace" variant="secondary">
          Marktplatz
        </ButtonLink>
      }
    >
      {result.missing.length > 0 ? (
        <p className="text-sm text-muted">
          Fehlende Slugs: {result.missing.join(", ")}
        </p>
      ) : null}
      {result.items.length === 0 ? (
        <EmptyState
          title="Keine Profile gefunden"
          description="Keiner der Slugs liegt im Katalog."
          actionHref="/marketplace"
          actionLabel="Agenten wählen"
        />
      ) : (
        <CompareTable agents={result.items} durationId={durationId ?? undefined} />
      )}
    </PageShell>
  );
}
