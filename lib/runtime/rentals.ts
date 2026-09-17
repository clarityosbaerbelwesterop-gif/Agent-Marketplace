import { and, desc, eq } from "drizzle-orm";
import { withUserRls } from "@/lib/db";
import { agentProfiles, rentals, workspaces } from "@/lib/db/schema";
import type { AgentRentalDuration } from "@/lib/db/json";

function pickDuration(
  durations: AgentRentalDuration[],
  durationId?: string,
): AgentRentalDuration | null {
  if (durations.length === 0) {
    return {
      id: "24h",
      label: "1 day",
      durationHours: 24,
      priceCents: 0,
      currency: "USD",
      usageIncluded: 0,
    };
  }
  if (durationId) {
    return durations.find((row) => row.id === durationId) ?? null;
  }
  return durations[0];
}

export async function ensurePersonalWorkspace(userId: string) {
  return withUserRls(userId, async (db) => {
    const [existing] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerUserId, userId))
      .orderBy(desc(workspaces.createdAt))
      .limit(1);
    if (existing) {
      return existing;
    }
    const [created] = await db
      .insert(workspaces)
      .values({ ownerUserId: userId, name: "Personal" })
      .returning();
    return created;
  });
}

export async function listRentals(userId: string) {
  return withUserRls(userId, async (db) => {
    const rows = await db
      .select({
        rental: rentals,
        agentSlug: agentProfiles.slug,
        agentName: agentProfiles.name,
        agentTier: agentProfiles.tier,
      })
      .from(rentals)
      .innerJoin(agentProfiles, eq(rentals.agentProfileId, agentProfiles.id))
      .where(eq(rentals.userId, userId))
      .orderBy(desc(rentals.createdAt))
      .limit(50);
    return rows.map((row) => ({
      ...row.rental,
      startsAt: row.rental.startsAt?.toISOString() ?? null,
      endsAt: row.rental.endsAt?.toISOString() ?? null,
      createdAt: row.rental.createdAt.toISOString(),
      agentSlug: row.agentSlug,
      agentName: row.agentName,
      agentTier: row.agentTier,
      billing: "unpaid_access" as const,
    }));
  });
}

export async function createUnpaidRental(input: {
  userId: string;
  slug: string;
  durationId?: string;
}) {
  const slug = input.slug.trim();
  if (!slug) {
    return { ok: false as const, error: "slug is required", status: 400 };
  }

  return withUserRls(input.userId, async (db) => {
    const [agent] = await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.slug, slug))
      .limit(1);
    if (!agent) {
      return { ok: false as const, error: "Agent not found", status: 404 };
    }
    if (agent.availability === "unavailable") {
      return {
        ok: false as const,
        error: "This agent is marked unavailable.",
        status: 409,
      };
    }

    const duration = pickDuration(agent.rentalOptions?.durations ?? [], input.durationId);
    if (!duration) {
      return {
        ok: false as const,
        error: `Unknown duration "${input.durationId}"`,
        status: 400,
      };
    }

    let [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerUserId, input.userId))
      .orderBy(desc(workspaces.createdAt))
      .limit(1);
    if (!workspace) {
      [workspace] = await db
        .insert(workspaces)
        .values({ ownerUserId: input.userId, name: "Personal" })
        .returning();
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + duration.durationHours * 60 * 60 * 1000);

    const [rental] = await db
      .insert(rentals)
      .values({
        userId: input.userId,
        workspaceId: workspace.id,
        agentProfileId: agent.id,
        status: "active",
        startsAt,
        endsAt,
        stripeSessionId: null,
        stripePaymentIntentId: null,
        usageIncluded: duration.usageIncluded,
        usageConsumed: 0,
      })
      .returning();

    return {
      ok: true as const,
      data: {
        ...rental,
        startsAt: rental.startsAt?.toISOString() ?? null,
        endsAt: rental.endsAt?.toISOString() ?? null,
        createdAt: rental.createdAt.toISOString(),
        agentSlug: agent.slug,
        agentName: agent.name,
        billing: "unpaid_access" as const,
        notice:
          "Stripe checkout is not implemented. This creates an unpaid access window so the agent runtime can run.",
      },
    };
  });
}

export function rentalIsActive(rental: {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  if (rental.status !== "active") {
    return false;
  }
  const now = Date.now();
  if (rental.startsAt && rental.startsAt.getTime() > now) {
    return false;
  }
  if (rental.endsAt && rental.endsAt.getTime() < now) {
    return false;
  }
  return true;
}

export async function getRentalForUser(userId: string, rentalId: string) {
  return withUserRls(userId, async (db) => {
    const [row] = await db
      .select({
        rental: rentals,
        agent: agentProfiles,
      })
      .from(rentals)
      .innerJoin(agentProfiles, eq(rentals.agentProfileId, agentProfiles.id))
      .where(and(eq(rentals.id, rentalId), eq(rentals.userId, userId)))
      .limit(1);
    return row ?? null;
  });
}
