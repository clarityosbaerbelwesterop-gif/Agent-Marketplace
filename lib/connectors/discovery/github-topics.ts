import { catalogOnlyCandidate } from "./catalog";
import { fetchJsonWithTimeout } from "./http";
import { GITHUB_TOPIC_SOURCE } from "./sources";
import type { DiscoveryCandidate, DiscoveryWarning } from "./types";

type GithubSearchResponse = {
  items?: Array<{
    full_name?: unknown;
    name?: unknown;
    html_url?: unknown;
    description?: unknown;
  }>;
};

function githubQuery(userQuery: string): string {
  const topicClause = GITHUB_TOPIC_SOURCE.topics
    .map((topic) => `topic:${topic}`)
    .join(" OR ");
  const grouped = `(${topicClause})`;
  return userQuery ? `${userQuery} ${grouped}` : grouped;
}

export async function fetchGithubTopicRepos(
  query: string,
): Promise<{ items: DiscoveryCandidate[]; warning: DiscoveryWarning | null }> {
  const url = new URL(GITHUB_TOPIC_SOURCE.searchUrl);
  url.searchParams.set("q", githubQuery(query));
  url.searchParams.set("per_page", "20");
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");

  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
  const token = process.env.GITHUB_DISCOVERY_TOKEN?.trim();
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const result = await fetchJsonWithTimeout(url.toString(), { headers });
  if (!result.ok) {
    return {
      items: [],
      warning: { source: GITHUB_TOPIC_SOURCE.id, error: result.error },
    };
  }

  const payload = result.data as GithubSearchResponse | null;
  const rows = Array.isArray(payload?.items) ? payload.items : [];
  const items: DiscoveryCandidate[] = [];

  for (const row of rows) {
    const fullName =
      typeof row.full_name === "string" ? row.full_name.trim() : "";
    const name = fullName || (typeof row.name === "string" ? row.name.trim() : "");
    if (!name) {
      continue;
    }
    const repoUrl = typeof row.html_url === "string" ? row.html_url.trim() : null;
    const description =
      typeof row.description === "string" && row.description.trim()
        ? row.description.trim()
        : "";
    items.push(
      catalogOnlyCandidate({
        name,
        repoUrl,
        description,
        source: GITHUB_TOPIC_SOURCE.id,
        sourceRef: fullName || name,
      }),
    );
  }

  return { items, warning: null };
}
