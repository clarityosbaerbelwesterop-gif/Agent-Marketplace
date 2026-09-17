import type { ParsedAgentsQuery } from "@/lib/catalog/parse-query";
import { MAX_COMPARE_SLUGS } from "@/lib/catalog/constants";

type HrefInput = Partial<ParsedAgentsQuery> & {
  compare?: string[];
};

function csv(values: string[] | undefined): string | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }
  return values.join(",");
}

export function marketplaceHref(input: HrefInput = {}): string {
  const params = new URLSearchParams();

  if (input.search) params.set("search", input.search);
  if (input.group) params.set("group", input.group);
  if (input.category) params.set("category", input.category);
  if (input.family) params.set("family", input.family);
  if (input.tier) params.set("tier", input.tier);
  if (input.sort && input.sort !== "newest") params.set("sort", input.sort);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.pageSize) params.set("pageSize", String(input.pageSize));
  const compare = csv(input.compare);
  if (compare) params.set("compare", compare);

  const query = params.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
}

export function toggleCompare(
  selected: string[],
  slug: string,
  max = MAX_COMPARE_SLUGS,
): string[] {
  if (selected.includes(slug)) {
    return selected.filter((item) => item !== slug);
  }
  if (selected.length >= max) {
    return selected;
  }
  return [...selected, slug];
}

export function compareHref(slugs: string[]): string {
  const unique = [...new Set(slugs)].slice(0, MAX_COMPARE_SLUGS);
  if (unique.length === 0) {
    return "/compare";
  }
  return `/compare?slugs=${encodeURIComponent(unique.join(","))}`;
}

export function checkoutHref(slug: string, durationId?: string): string {
  const params = new URLSearchParams({ agent: slug });
  if (durationId) params.set("duration", durationId);
  return `/checkout?${params.toString()}`;
}

export function rentalCheckoutHref(rentalId: string): string {
  return `/checkout?rentalId=${encodeURIComponent(rentalId)}`;
}

export function agentHref(slug: string, durationId?: string): string {
  if (!durationId) {
    return `/agents/${slug}`;
  }
  return `/agents/${slug}?duration=${encodeURIComponent(durationId)}`;
}

export function chatRentalHref(rentalId: string): string {
  return `/chat?rentalId=${encodeURIComponent(rentalId)}`;
}

export function chatSessionHref(sessionId: string): string {
  return `/chat?sessionId=${encodeURIComponent(sessionId)}`;
}

export function groupChatHref(rentalIds: string[] = []): string {
  const unique = [...new Set(rentalIds.filter(Boolean))];
  if (unique.length === 0) {
    return "/chat/group";
  }
  return `/chat/group?rentalIds=${encodeURIComponent(unique.join(","))}`;
}
