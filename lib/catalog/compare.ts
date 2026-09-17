import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agentProfiles, agentSkills } from "@/lib/db/schema";
import { parseSkillRef } from "./queries";
import { MAX_COMPARE_SLUGS } from "./constants";
import type { AgentCompareItem, AgentCompareResponse } from "./types";

export { MAX_COMPARE_SLUGS };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export type CompareParseError = {
  error: string;
  status: 400;
};

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function splitSlugs(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Parse `?slugs=a,b,c` (or repeated `slugs=`). Max 4 unique slugs, request order kept.
 */
export function parseCompareSlugs(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): { slugs: string[] } | CompareParseError {
  const collected: string[] = [];

  if (input instanceof URLSearchParams) {
    for (const value of input.getAll("slugs")) {
      collected.push(...splitSlugs(value));
    }
  } else {
    const raw = input.slugs;
    if (Array.isArray(raw)) {
      for (const value of raw) {
        collected.push(...splitSlugs(value));
      }
    } else if (typeof raw === "string") {
      collected.push(...splitSlugs(raw));
    } else {
      const single = first(raw);
      if (single) {
        collected.push(...splitSlugs(single));
      }
    }
  }

  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const slug of collected) {
    if (!SLUG_PATTERN.test(slug)) {
      return { error: `Invalid slug: ${slug}`, status: 400 };
    }
    const key = slug.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    slugs.push(slug);
  }

  if (slugs.length === 0) {
    return { error: "slugs is required (comma-separated, max 4)", status: 400 };
  }
  if (slugs.length > MAX_COMPARE_SLUGS) {
    return {
      error: `Compare supports at most ${MAX_COMPARE_SLUGS} agents`,
      status: 400,
    };
  }

  return { slugs };
}

function summarizeInstructions(instructions: string): string {
  const collapsed = instructions.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 280) {
    return collapsed;
  }
  return `${collapsed.slice(0, 277).trimEnd()}...`;
}

export async function compareAgents(
  slugs: string[],
): Promise<AgentCompareResponse> {
  const db = getDb();
  const profiles = await db
    .select({
      id: agentProfiles.id,
      slug: agentProfiles.slug,
      name: agentProfiles.name,
      category: agentProfiles.category,
      tier: agentProfiles.tier,
      modelAlias: agentProfiles.modelAlias,
      ratingStatus: agentProfiles.ratingStatus,
      rentalOptions: agentProfiles.rentalOptions,
      connectors: agentProfiles.connectors,
      skillPackageVersion: agentProfiles.skillPackageVersion,
    })
    .from(agentProfiles)
    .where(inArray(agentProfiles.slug, slugs));

  const bySlug = new Map(
    profiles.map((row) => [row.slug.toLowerCase(), row] as const),
  );
  const profileIds = profiles.map((row) => row.id);
  const refs = profiles
    .map((row) => parseSkillRef(row.skillPackageVersion))
    .filter((ref): ref is { slug: string; version: string } => ref !== null);

  const skillFilters: SQL[] = [];
  if (profileIds.length > 0) {
    skillFilters.push(inArray(agentSkills.agentProfileId, profileIds));
  }
  for (const ref of refs) {
    const clause = and(
      eq(agentSkills.slug, ref.slug),
      eq(agentSkills.version, ref.version),
    );
    if (clause) {
      skillFilters.push(clause);
    }
  }

  const skillRows =
    skillFilters.length === 0
      ? []
      : await db
          .select({
            id: agentSkills.id,
            agentProfileId: agentSkills.agentProfileId,
            slug: agentSkills.slug,
            version: agentSkills.version,
            instructions: agentSkills.instructions,
          })
          .from(agentSkills)
          .where(and(eq(agentSkills.published, true), or(...skillFilters)));

  const items: AgentCompareItem[] = [];
  const missing: string[] = [];

  for (const slug of slugs) {
    const profile = bySlug.get(slug.toLowerCase());
    if (!profile) {
      missing.push(slug);
      continue;
    }
    const ref = parseSkillRef(profile.skillPackageVersion);
    const skills = skillRows
      .filter(
        (skill) =>
          skill.agentProfileId === profile.id ||
          (ref !== null &&
            skill.slug === ref.slug &&
            skill.version === ref.version),
      )
      .map((skill) => ({
        slug: skill.slug,
        version: skill.version,
        summary: summarizeInstructions(skill.instructions),
      }));

    items.push({
      slug: profile.slug,
      name: profile.name,
      category: profile.category,
      tier: profile.tier,
      modelAlias: profile.modelAlias,
      ratingStatus: profile.ratingStatus,
      rentalOptions: profile.rentalOptions,
      connectors: profile.connectors ?? [],
      skills,
    });
  }

  return { items, missing, requested: slugs };
}
