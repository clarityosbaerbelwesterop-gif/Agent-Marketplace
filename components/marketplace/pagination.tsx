import { marketplaceHref } from "@/lib/urls";
import type { ParsedAgentsQuery } from "@/lib/catalog/parse-query";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function Pagination({
  query,
  compare,
  page,
  pageCount,
}: {
  query: ParsedAgentsQuery;
  compare: string[];
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) {
    return null;
  }

  const pages = Array.from({ length: Math.min(pageCount, 12) }, (_, index) => index + 1);

  return (
    <nav aria-label="Seiten" className="flex flex-wrap items-center gap-2">
      {pages.map((pageNumber) => {
        const current = pageNumber === page;
        return (
          <Link
            key={pageNumber}
            href={marketplaceHref({ ...query, page: pageNumber, compare })}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-md text-sm",
              current
                ? "bg-accent text-accent-foreground"
                : "bg-surface-raised ring-1 ring-border hover:bg-accent-subtle",
            )}
          >
            <span className="sr-only">Seite </span>
            {pageNumber}
          </Link>
        );
      })}
    </nav>
  );
}
