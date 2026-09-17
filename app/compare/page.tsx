import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import {
  compareAgents,
  isDatabaseConfigured,
  parseCompareSlugs,
} from "@/lib/catalog";
import type { AgentCompareItem } from "@/lib/catalog/types";

export const metadata: Metadata = {
  title: "Compare agents",
};

export const dynamic = "force-dynamic";

function formatPrice(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function Cell({ children }: { children: ReactNode }) {
  return <td className="align-top px-3 py-2 text-sm">{children}</td>;
}

function FieldRow({
  label,
  items,
  render,
}: {
  label: string;
  items: AgentCompareItem[];
  render: (item: AgentCompareItem) => ReactNode;
}) {
  return (
    <tr className="border-t border-border">
      <th className="px-3 py-2 text-left text-sm font-medium text-muted" scope="row">
        {label}
      </th>
      {items.map((item) => (
        <Cell key={item.slug}>{render(item)}</Cell>
      ))}
    </tr>
  );
}

export default async function ComparePage({
  searchParams,
}: PageProps<"/compare">) {
  const raw = await searchParams;

  const parsed = parseCompareSlugs(raw);
  if ("error" in parsed) {
    return (
      <PageShell title="Compare agents" description={parsed.error}>
        <p className="text-sm text-muted">
          Pick up to four catalog slugs from the{" "}
          <Link className="underline underline-offset-4" href="/marketplace">
            marketplace
          </Link>
          , or open{" "}
          <code className="font-mono text-xs">/compare?slugs=a,b,c</code>.
        </p>
      </PageShell>
    );
  }

  if (!isDatabaseConfigured()) {
    return (
      <PageShell
        title="Compare agents"
        description="Catalog database is not configured on this server."
      />
    );
  }

  const result = await compareAgents(parsed.slugs);

  if (result.items.length === 0) {
    return (
      <PageShell
        title="Compare agents"
        description="None of those slugs were in the catalog."
      >
        <Link className="text-sm underline underline-offset-4" href="/marketplace">
          Back to marketplace
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Compare agents"
      description="Catalog fields only: tier, model alias, rental options, published skill summaries, connectors, and rating status. No invented benchmarks."
    >
      {result.missing.length > 0 ? (
        <p className="text-sm text-muted">
          Missing slugs: {result.missing.join(", ")}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-sm font-medium text-muted">
                Field
              </th>
              {result.items.map((item) => (
                <th key={item.slug} className="px-3 py-2 text-left text-sm">
                  <Link
                    className="underline underline-offset-4"
                    href={`/agents/${item.slug}`}
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 font-mono text-xs font-normal text-muted">
                    {item.slug}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <FieldRow
              label="Tier"
              items={result.items}
              render={(item) => item.tier}
            />
            <FieldRow
              label="Model alias"
              items={result.items}
              render={(item) => item.modelAlias ?? "—"}
            />
            <FieldRow
              label="Rating status"
              items={result.items}
              render={(item) => item.ratingStatus}
            />
            <FieldRow
              label="Category"
              items={result.items}
              render={(item) => item.category}
            />
            <FieldRow
              label="Rental options"
              items={result.items}
              render={(item) => {
                const durations = item.rentalOptions.durations ?? [];
                if (durations.length === 0) {
                  return "—";
                }
                return (
                  <ul className="flex flex-col gap-1 text-muted">
                    {durations.map((duration) => (
                      <li key={duration.id}>
                        {duration.label}: {formatPrice(duration.priceCents, duration.currency)}{" "}
                        · {duration.usageIncluded.toLocaleString()}{" "}
                        {item.rentalOptions.usageUnit ?? "tokens"}
                      </li>
                    ))}
                  </ul>
                );
              }}
            />
            <FieldRow
              label="Connectors"
              items={result.items}
              render={(item) =>
                item.connectors.length === 0
                  ? "—"
                  : item.connectors
                      .map((connector) => connector.provider)
                      .join(", ")
              }
            />
            <FieldRow
              label="Skills"
              items={result.items}
              render={(item) => {
                if (item.skills.length === 0) {
                  return "—";
                }
                return (
                  <ul className="flex flex-col gap-2">
                    {item.skills.map((skill) => (
                      <li key={`${skill.slug}@${skill.version}`}>
                        <span className="font-mono text-xs">
                          {skill.slug}@{skill.version}
                        </span>
                        {skill.summary ? (
                          <p className="mt-1 text-muted">{skill.summary}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                );
              }}
            />
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted">
        <Link className="underline underline-offset-4" href="/marketplace">
          Back to marketplace
        </Link>
      </p>
    </PageShell>
  );
}
