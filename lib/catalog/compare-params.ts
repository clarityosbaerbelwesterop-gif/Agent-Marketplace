import type { ParsedAgentsQuery } from "@/lib/catalog/parse-query";
import { MAX_COMPARE_SLUGS } from "@/lib/catalog/constants";
import { firstSearchParam, splitCsv } from "@/lib/utils";

export function parseCompareSlugs(
  searchParams: Record<string, string | string[] | undefined>,
): string[] {
  return splitCsv(firstSearchParam(searchParams.compare)).slice(
    0,
    MAX_COMPARE_SLUGS,
  );
}

export function marketplaceQueryWithCompare(
  parsed: ParsedAgentsQuery,
  compare: string[],
): ParsedAgentsQuery & { compare: string[] } {
  return { ...parsed, compare };
}
