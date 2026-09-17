import Link from "next/link";
import {
  AGENT_TYPES,
  AGENT_TYPE_BLURBS,
  AGENT_TYPE_LABELS,
} from "@/lib/catalog/agent-types";
import { marketplaceHref } from "@/lib/urls";
import type { ParsedAgentsQuery } from "@/lib/catalog/parse-query";
import { cn } from "@/lib/utils";

export function MarketplaceTypeFilters({
  query,
  compare,
}: {
  query: ParsedAgentsQuery;
  compare: string[];
}) {
  return (
    <nav aria-label="Agententypen" className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
        Agententypen
      </p>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={marketplaceHref({
              ...query,
              group: null,
              family: null,
              category: null,
              page: 1,
              compare,
            })}
            className={cn(
              "inline-flex h-10 items-center rounded-full px-4 text-sm ring-1 transition-colors",
              query.group || query.family
                ? "bg-surface-raised text-muted ring-border hover:bg-accent-subtle hover:text-foreground"
                : "bg-accent text-accent-foreground ring-accent",
            )}
          >
            Alle Typen
          </Link>
        </li>
        {AGENT_TYPES.map((type) => {
          const active = query.group === type || query.family === type;
          return (
            <li key={type}>
              <Link
                href={marketplaceHref({
                  ...query,
                  group: type,
                  family: type,
                  category: null,
                  page: 1,
                  compare,
                })}
                title={AGENT_TYPE_BLURBS[type]}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-full px-4 text-sm ring-1 transition-colors",
                  active
                    ? "bg-accent text-accent-foreground ring-accent"
                    : "bg-surface-raised text-foreground ring-border hover:bg-accent-subtle",
                )}
              >
                {AGENT_TYPE_LABELS[type]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
