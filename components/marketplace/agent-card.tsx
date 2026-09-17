import { AgentIdentityMark } from "@/components/agent/agent-meta-badges";
import { AgentMetaBadges } from "@/components/agent/agent-meta-badges";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { MAX_COMPARE_SLUGS } from "@/lib/catalog/constants";
import { marketplaceHref, toggleCompare } from "@/lib/urls";
import type { ParsedAgentsQuery } from "@/lib/catalog/parse-query";
import type { AgentListItem } from "@/lib/catalog/types";
import { isDesignCategory } from "@/lib/catalog/agent-types";
import { isUntested, pickDuration } from "@/lib/ui/agent-presentation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { CSSProperties } from "react";

export function AgentCard({
  agent,
  query,
  compare,
}: {
  agent: AgentListItem;
  query: ParsedAgentsQuery;
  compare: string[];
}) {
  const selected = compare.includes(agent.slug);
  const compareFull = compare.length >= MAX_COMPARE_SLUGS && !selected;
  const nextCompare = toggleCompare(compare, agent.slug);
  const compareHref = marketplaceHref({ ...query, compare: nextCompare });
  const duration = pickDuration(agent);
  const design = isDesignCategory(agent.category);

  return (
    <article
      className={cn(
        "flex h-full flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface-raised p-5 shadow-card",
        design && "agent-card-design",
      )}
      style={
        design && agent.accentColor
          ? ({ "--card-accent": agent.accentColor } as CSSProperties)
          : undefined
      }
    >
      {design ? (
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Atelier</p>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AgentIdentityMark agent={agent} />
          <div className="flex flex-col gap-1">
            <h2
              className={cn(
                "font-display tracking-tight",
                design ? "text-3xl leading-none" : "text-2xl leading-none",
              )}
            >
              <Link href={`/agents/${agent.slug}`} className="hover:underline">
                {agent.name}
              </Link>
            </h2>
            <p className="text-xs text-muted">{agent.slug}</p>
          </div>
        </div>
        {isUntested(agent) ? <Badge tone="warning">Ungeprüft</Badge> : null}
      </div>

      <p
        className={cn(
          "text-sm leading-relaxed text-muted",
          design ? "line-clamp-4 font-display italic" : "line-clamp-3",
        )}
      >
        {agent.tagline ?? agent.description}
      </p>

      <AgentMetaBadges agent={agent} />

      <p className="text-sm leading-relaxed">
        {agent.specializations[0] ?? agent.modelAlias ?? "Fähigkeitspaket folgt aus dem Katalog."}
      </p>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
        <p className="tabular text-sm font-medium">
          {duration
            ? `${formatMoney({ amountCents: duration.priceCents, currency: duration.currency })} · ${duration.label}`
            : "Preis im Profil"}
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          {compareFull ? (
            <span className="text-muted">Vergleich voll ({MAX_COMPARE_SLUGS})</span>
          ) : (
            <Link href={compareHref} className="underline-offset-4 hover:underline">
              {selected ? "Aus Vergleich" : "Vergleichen"}
            </Link>
          )}
          <Link
            href={`/agents/${agent.slug}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {design ? "Portfolio" : "Profil"}
          </Link>
        </div>
      </div>
    </article>
  );
}
