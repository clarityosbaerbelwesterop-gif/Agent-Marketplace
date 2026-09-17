import { and, desc, eq } from "drizzle-orm";
import { withUserRls } from "@/lib/db";
import { agentProfiles, favorites } from "@/lib/db/schema";
import type { AgentListItem, FavoriteListItem } from "./types";

const listColumns = {
  id: agentProfiles.id,
  slug: agentProfiles.slug,
  name: agentProfiles.name,
  description: agentProfiles.description,
  category: agentProfiles.category,
  family: agentProfiles.family,
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

export async function listFavorites(userId: string): Promise<FavoriteListItem[]> {
  return withUserRls(userId, async (db) => {
    const rows = await db
      .select({
        ...listColumns,
        favoritedAt: favorites.createdAt,
      })
      .from(favorites)
      .innerJoin(agentProfiles, eq(favorites.agentProfileId, agentProfiles.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    return rows.map((row) => ({
      ...(row as AgentListItem),
      favoritedAt: row.favoritedAt.toISOString(),
    }));
  });
}

export async function addFavorite(
  userId: string,
  slug: string,
): Promise<{ ok: true } | { error: string; status: 404 | 400 }> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return { error: "slug is required", status: 400 };
  }

  return withUserRls(userId, async (db) => {
    const [agent] = await db
      .select({ id: agentProfiles.id })
      .from(agentProfiles)
      .where(eq(agentProfiles.slug, trimmed))
      .limit(1);

    if (!agent) {
      return { error: "Agent not found", status: 404 };
    }

    await db
      .insert(favorites)
      .values({ userId, agentProfileId: agent.id })
      .onConflictDoNothing();

    return { ok: true as const };
  });
}

export async function removeFavorite(
  userId: string,
  slug: string,
): Promise<{ ok: true } | { error: string; status: 404 | 400 }> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return { error: "slug is required", status: 400 };
  }

  return withUserRls(userId, async (db) => {
    const [agent] = await db
      .select({ id: agentProfiles.id })
      .from(agentProfiles)
      .where(eq(agentProfiles.slug, trimmed))
      .limit(1);

    if (!agent) {
      return { error: "Agent not found", status: 404 };
    }

    await db
      .delete(favorites)
      .where(
        and(eq(favorites.userId, userId), eq(favorites.agentProfileId, agent.id)),
      );

    return { ok: true as const };
  });
}
