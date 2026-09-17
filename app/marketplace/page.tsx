import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { AGENT_CATEGORIES, AGENT_TIERS } from "@/lib/catalog/constants";
import { parseAgentsQuery } from "@/lib/catalog/parse-query";
import { isDatabaseConfigured, listAgents } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Marketplace",
};

export const dynamic = "force-dynamic";

function hrefFor(params: {
  search?: string | null;
  category?: string | null;
  tier?: string | null;
  sort?: string | null;
  page?: number;
  pageSize?: number;
}): string {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.category) qs.set("category", params.category);
  if (params.tier) qs.set("tier", params.tier);
  if (params.sort && params.sort !== "newest") qs.set("sort", params.sort);
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const query = qs.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
}

export default async function MarketplacePage({
  searchParams,
}: PageProps<"/marketplace">) {
  const raw = await searchParams;
  const parsed = parseAgentsQuery(raw);

  if ("error" in parsed) {
    return (
      <PageShell title="Marketplace" description={parsed.error}>
        <Link className="text-sm underline underline-offset-4" href="/marketplace">
          Clear filters
        </Link>
      </PageShell>
    );
  }

  if (!isDatabaseConfigured()) {
    return (
      <PageShell
        title="Marketplace"
        description="Catalog database is not configured on this server."
      />
    );
  }

  const result = await listAgents(parsed);

  return (
    <PageShell
      title="Marketplace"
      description="Paginated catalog from Postgres. The browser only receives this page of results, not the full catalog."
    >
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" method="get">
        <label className="text-sm">
          Search
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            name="search"
            defaultValue={parsed.search ?? ""}
            placeholder="Name, slug, specialization"
          />
        </label>
        <label className="text-sm">
          Category
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            name="category"
            defaultValue={parsed.category ?? ""}
          >
            <option value="">All</option>
            {AGENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Tier
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            name="tier"
            defaultValue={parsed.tier ?? ""}
          >
            <option value="">All</option>
            {AGENT_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Sort
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            name="sort"
            defaultValue={parsed.sort}
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="tier">Tier</option>
            <option value="updated">Updated</option>
          </select>
        </label>
        <div className="sm:col-span-2 lg:col-span-4">
          <button
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-border/40"
            type="submit"
          >
            Apply
          </button>
        </div>
      </form>

      <p className="text-sm text-muted">
        {result.total} agents · page {result.page} of {result.totalPages || 1}
      </p>

      {result.items.length === 0 ? (
        <p className="text-sm text-muted">No agents match these filters.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {result.items.map((agent) => (
            <li key={agent.id} className="py-4">
              <Link
                className="text-sm font-medium underline-offset-4 hover:underline"
                href={`/agents/${agent.slug}`}
              >
                {agent.name}
              </Link>
              <p className="mt-1 text-sm text-muted">{agent.tagline ?? agent.description}</p>
              <p className="mt-1 text-xs text-muted">
                {agent.category} · {agent.tier} · {agent.ratingStatus}
                {agent.modelAlias ? ` · alias ${agent.modelAlias}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {result.totalPages > 1 ? (
        <nav className="flex items-center gap-4 text-sm" aria-label="Pagination">
          {result.page > 1 ? (
            <Link
              className="underline underline-offset-4"
              href={hrefFor({ ...parsed, page: result.page - 1 })}
            >
              Previous
            </Link>
          ) : (
            <span className="text-muted">Previous</span>
          )}
          {result.page < result.totalPages ? (
            <Link
              className="underline underline-offset-4"
              href={hrefFor({ ...parsed, page: result.page + 1 })}
            >
              Next
            </Link>
          ) : (
            <span className="text-muted">Next</span>
          )}
        </nav>
      ) : null}
    </PageShell>
  );
}
