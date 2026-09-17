import {
  AGENT_CATEGORY_SET,
  AGENT_SORT_SET,
  AGENT_TIER_SET,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  type AgentSort,
} from "./constants";
import { AGENT_FAMILY_SET, isAgentFamily, type AgentFamily } from "./family";
import {
  isAgentCategoryGroup,
  categoriesForGroup,
  type AgentCategoryGroup,
} from "./groups";

export type ParsedAgentsQuery = {
  search: string | null;
  category: string | null;
  group: AgentCategoryGroup | null;
  family: AgentFamily | null;
  tier: string | null;
  sort: AgentSort;
  page: number;
  pageSize: number;
};

export type QueryParseError = {
  error: string;
  status: 400;
};

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function parsePositiveInt(raw: string | null, fallback: number): number | null {
  if (raw === null || raw === "") {
    return fallback;
  }
  if (!/^[0-9]+$/.test(raw)) {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return n;
}

/** Strip LIKE wildcards so user search cannot broaden the match. */
export function sanitizeSearch(raw: string): string {
  return raw.replace(/[%_]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

export function parseAgentsQuery(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): ParsedAgentsQuery | QueryParseError {
  const get =
    input instanceof URLSearchParams
      ? (key: string) => input.get(key)
      : (key: string) => first(input[key]);

  const searchRaw = get("search")?.trim() ?? "";
  const search = searchRaw ? sanitizeSearch(searchRaw) : null;

  const groupRaw = get("group")?.trim() || null;
  if (groupRaw && !isAgentCategoryGroup(groupRaw)) {
    return { error: `Unknown group: ${groupRaw}`, status: 400 };
  }

  const familyRaw = get("family")?.trim() || null;
  if (familyRaw && !AGENT_FAMILY_SET.has(familyRaw)) {
    return { error: `Unknown family: ${familyRaw}`, status: 400 };
  }

  const categoryRaw = get("category")?.trim() || null;
  if (
    categoryRaw &&
    !AGENT_CATEGORY_SET.has(categoryRaw) &&
    !isAgentFamily(categoryRaw) &&
    !isAgentCategoryGroup(categoryRaw)
  ) {
    return { error: `Unknown category: ${categoryRaw}`, status: 400 };
  }

  const familyFromAlias =
    categoryRaw && isAgentFamily(categoryRaw) ? categoryRaw : null;
  const family =
    (familyRaw as AgentFamily | null) ??
    familyFromAlias ??
    (groupRaw as AgentFamily | null);
  const group =
    (groupRaw as AgentCategoryGroup | null) ??
    (family && isAgentCategoryGroup(family) ? family : null) ??
    (familyFromAlias && isAgentCategoryGroup(familyFromAlias)
      ? familyFromAlias
      : null);

  const category =
    categoryRaw && AGENT_CATEGORY_SET.has(categoryRaw) ? categoryRaw : null;

  if (category && group && !categoriesForGroup(group).includes(category)) {
    return {
      error: `Category ${category} is not in the ${group} group`,
      status: 400,
    };
  }

  const tierRaw = get("tier")?.trim() || null;
  if (tierRaw && !AGENT_TIER_SET.has(tierRaw)) {
    return { error: `Unknown tier: ${tierRaw}`, status: 400 };
  }

  const sortRaw = get("sort")?.trim() || "newest";
  if (!AGENT_SORT_SET.has(sortRaw)) {
    return { error: `Unknown sort: ${sortRaw}`, status: 400 };
  }

  const page = parsePositiveInt(get("page"), 1);
  if (page === null) {
    return { error: "page must be a positive integer", status: 400 };
  }

  const pageSize = parsePositiveInt(get("pageSize"), DEFAULT_PAGE_SIZE);
  if (pageSize === null) {
    return { error: "pageSize must be a positive integer", status: 400 };
  }

  return {
    search: search || null,
    category,
    group,
    family,
    tier: tierRaw,
    sort: sortRaw as AgentSort,
    page,
    pageSize: Math.min(Math.max(pageSize, MIN_PAGE_SIZE), MAX_PAGE_SIZE),
  };
}
