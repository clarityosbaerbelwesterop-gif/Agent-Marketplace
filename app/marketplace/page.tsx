import type { Metadata } from "next";
import { AgentCard } from "@/components/marketplace/agent-card";
import { CompareBar } from "@/components/marketplace/compare-bar";
import { MarketplaceFilters } from "@/components/marketplace/filters";
import { Pagination } from "@/components/marketplace/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button-link";
import { PageShell } from "@/components/page-shell";
import { parseCompareSlugs } from "@/lib/catalog/compare-params";
import { parseAgentsQuery } from "@/lib/catalog/parse-query";
import {
  getAgentBySlug,
  isDatabaseConfigured,
  listAgents,
} from "@/lib/catalog/queries";
import { marketplaceHref } from "@/lib/urls";
import type { AgentDetail } from "@/lib/catalog/types";

export const metadata: Metadata = {
  title: "Marktplatz",
  description:
    "Paginierten Katalog filtern. Die volle Liste geht nicht an den Browser.",
};

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: PageProps<"/marketplace">) {
  const params = await searchParams;
  const parsed = parseAgentsQuery(params);
  const compare = parseCompareSlugs(params);

  if ("error" in parsed) {
    return (
      <PageShell width="wide" title="Marktplatz" description={parsed.error}>
        <ButtonLink href="/marketplace" variant="secondary">
          Filter zurücksetzen
        </ButtonLink>
      </PageShell>
    );
  }

  if (!isDatabaseConfigured()) {
    return (
      <PageShell
        width="wide"
        eyebrow="Marktplatz"
        title="Agenten mieten"
        description="Der Katalog liegt in Postgres. DATABASE_URL fehlt auf diesem Server."
      >
        <EmptyState
          title="Katalog nicht verbunden"
          description="Ohne Datenbank wird die 10k-Seed-Liste nicht geladen. Es gibt keinen stillen Fallback auf UI-Fixtures."
        />
      </PageShell>
    );
  }

  const result = await listAgents(parsed);
  const selected = (
    await Promise.all(compare.map((slug) => getAgentBySlug(slug)))
  ).filter((agent): agent is AgentDetail => Boolean(agent));

  const hasFilters = Boolean(parsed.search || parsed.category || parsed.tier);

  return (
    <PageShell
      width="wide"
      eyebrow="Marktplatz"
      title="Agenten mieten"
      description="Suche, Filter und Sortierung laufen serverseitig über die Catalog API. Eine Seite, nicht der ganze Bestand."
      actions={
        <ButtonLink href="/compare" variant="secondary">
          Vergleich
        </ButtonLink>
      }
    >
      <MarketplaceFilters query={parsed} compare={compare} />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>
          {result.total === 0
            ? "Keine Treffer"
            : `${result.total.toLocaleString("de-DE")} Profile · Seite ${result.page} von ${result.totalPages || 1}`}
        </p>
        {hasFilters ? (
          <ButtonLink
            href={marketplaceHref({ compare })}
            variant="ghost"
            size="sm"
          >
            Filter zurücksetzen
          </ButtonLink>
        ) : null}
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title="Nichts gefunden"
          description="Passen Sie Suche, Kategorie oder Stufe an. Der Bestand kommt aus Postgres, nicht aus Fixtures."
          actionHref="/marketplace"
          actionLabel="Alle Profile"
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((agent) => (
            <li key={agent.id}>
              <AgentCard agent={agent} query={parsed} compare={compare} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        query={parsed}
        compare={compare}
        page={result.page}
        pageCount={result.totalPages}
      />
      <CompareBar query={parsed} compare={compare} selected={selected} />
    </PageShell>
  );
}
