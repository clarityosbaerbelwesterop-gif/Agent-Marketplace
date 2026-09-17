import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agentProfiles, agentSkills } from "@/lib/db/schema";
import type { ParsedAgentsQuery } from "./parse-query";
import type { AgentTier } from "./constants";
import type {
  AgentDetail,
  AgentListItem,
  AgentListResponse,
  AgentSkillSummary,
} from "./types";

const listColumns = {
  id: agentProfiles.id,
  slug: agentProfiles.slug,
  name: agentProfiles.name,
  description: agentProfiles.description,
  category: agentProfiles.category,
  specializations: agentProfiles.specializations,
  languages: agentProfiles.languages,
  tier: agentProfiles.tier,
  tagline: agentProfiles.tagline,
  accentColor: agentProfiles.accentColor,
  modelAlias: agentProfiles.modelAlias,
  skillPackageVersion: agentProfiles.skillPackageVersion,
  ratingStatus: agentProfiles.ratingStatus,
  availability: agentProfiles.availability,
  rentalOptions: agentProfiles.rentalOptions,
};

function catalogWhere(query: ParsedAgentsQuery): SQL | undefined {
  const parts: SQL[] = [];

  if (query.category) {
    parts.push(eq(agentProfiles.category, query.category));
  }
  if (query.tier) {
    parts.push(eq(agentProfiles.tier, query.tier as AgentTier));
  }
  if (query.search) {
    const pattern = `%${query.search}%`;
    const searchClause = or(
      ilike(agentProfiles.name, pattern),
      ilike(agentProfiles.description, pattern),
      ilike(agentProfiles.tagline, pattern),
      ilike(agentProfiles.slug, pattern),
      sql`${agentProfiles.specializations}::text ilike ${pattern}`,
    );
    if (searchClause) {
      parts.push(searchClause);
    }
  }

  if (parts.length === 0) {
    return undefined;
  }
  return and(...parts);
}

function orderBy(sort: ParsedAgentsQuery["sort"]) {
  switch (sort) {
    case "name":
      return [asc(agentProfiles.name), asc(agentProfiles.slug)];
    case "tier":
      return [asc(agentProfiles.tier), asc(agentProfiles.name)];
    case "updated":
      return [desc(agentProfiles.updatedAt), asc(agentProfiles.slug)];
    case "newest":
    default:
      return [desc(agentProfiles.createdAt), asc(agentProfiles.slug)];
  }
}

export function parseSkillRef(
  ref: string | null,
): { slug: string; version: string } | null {
  if (!ref) {
    return null;
  }
  const at = ref.lastIndexOf("@");
  if (at <= 0 || at === ref.length - 1) {
    return null;
  }
  return { slug: ref.slice(0, at), version: ref.slice(at + 1) };
}

export async function listAgents(
  query: ParsedAgentsQuery,
): Promise<AgentListResponse> {
  const db = getDb();
  const where = catalogWhere(query);

  const countQuery = db.select({ total: count() }).from(agentProfiles);
  const [countRow] = where ? await countQuery.where(where) : await countQuery;
  const total = Number(countRow?.total ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);
  const page = totalPages === 0 ? 1 : Math.min(query.page, totalPages);
  const offset = (page - 1) * query.pageSize;

  const listQuery = db
    .select(listColumns)
    .from(agentProfiles)
    .orderBy(...orderBy(query.sort))
    .limit(query.pageSize)
    .offset(offset);

  const rows = where ? await listQuery.where(where) : await listQuery;

  return {
    items: rows as AgentListItem[],
    page,
    pageSize: query.pageSize,
    total,
    totalPages,
    sort: query.sort,
    filters: {
      search: query.search,
      category: query.category,
      tier: query.tier,
    },
  };
}

function toSkillSummary(row: {
  id: string;
  slug: string;
  version: string;
  instructions: string;
  published: boolean;
}): AgentSkillSummary {
  return {
    id: row.id,
    slug: row.slug,
    version: row.version,
    instructions: row.instructions,
    published: row.published,
  };
}

export async function getAgentBySlug(slug: string): Promise<AgentDetail | null> {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(agentProfiles)
    .where(eq(agentProfiles.slug, slug))
    .limit(1);

  if (!profile) {
    return null;
  }

  const ref = parseSkillRef(profile.skillPackageVersion);
  const skillFilter = ref
    ? and(
        eq(agentSkills.published, true),
        or(
          eq(agentSkills.agentProfileId, profile.id),
          and(eq(agentSkills.slug, ref.slug), eq(agentSkills.version, ref.version)),
        ),
      )
    : and(eq(agentSkills.published, true), eq(agentSkills.agentProfileId, profile.id));

  const skills = await db
    .select({
      id: agentSkills.id,
      slug: agentSkills.slug,
      version: agentSkills.version,
      instructions: agentSkills.instructions,
      published: agentSkills.published,
    })
    .from(agentSkills)
    .where(skillFilter);

  return {
    id: profile.id,
    slug: profile.slug,
    name: profile.name,
    description: profile.description,
    category: profile.category,
    specializations: profile.specializations,
    languages: profile.languages,
    tier: profile.tier,
    tagline: profile.tagline,
    accentColor: profile.accentColor,
    modelAlias: profile.modelAlias,
    skillPackageVersion: profile.skillPackageVersion,
    ratingStatus: profile.ratingStatus,
    availability: profile.availability,
    rentalOptions: profile.rentalOptions,
    avatarUrl: profile.avatarUrl,
    bannerUrl: profile.bannerUrl,
    modelConfig: profile.modelConfig ?? {},
    connectors: profile.connectors ?? [],
    permissions: profile.permissions ?? {},
    configVersion: profile.configVersion,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    skills: skills.map(toSkillSummary),
  };
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
