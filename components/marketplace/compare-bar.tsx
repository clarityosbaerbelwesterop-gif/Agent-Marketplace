import { ButtonLink } from "@/components/ui/button-link";
import { MAX_COMPARE_SLUGS } from "@/lib/catalog/constants";
import { compareHref, marketplaceHref } from "@/lib/urls";
import type { ParsedAgentsQuery } from "@/lib/catalog/parse-query";
import type { AgentListItem } from "@/lib/catalog/types";
import Link from "next/link";

export function CompareBar({
  query,
  compare,
  selected,
}: {
  query: ParsedAgentsQuery;
  compare: string[];
  selected: AgentListItem[];
}) {
  if (selected.length === 0) {
    return null;
  }

  return (
    <div className="sticky bottom-4 z-30 rounded-[var(--radius-lg)] border border-border bg-surface-raised/95 p-4 shadow-card backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium">
            Vergleich ({selected.length} von {MAX_COMPARE_SLUGS})
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
            {selected.map((agent) => (
              <li key={agent.slug}>
                <Link
                  href={marketplaceHref({
                    ...query,
                    compare: compare.filter((slug) => slug !== agent.slug),
                  })}
                  className="underline-offset-4 hover:underline"
                >
                  {agent.name} entfernen
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            href={marketplaceHref({ ...query, compare: [] })}
            variant="ghost"
            size="sm"
          >
            Leeren
          </ButtonLink>
          <ButtonLink href={compareHref(selected.map((agent) => agent.slug))} size="sm">
            Seite an Seite
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
