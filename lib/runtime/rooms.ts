import { and, desc, eq, inArray } from "drizzle-orm";
import { withUserRls, type Database } from "@/lib/db";
import {
  agentProfiles,
  agentSessionMembers,
  agentSessions,
  rentals,
} from "@/lib/db/schema";
import { rentalAccessError, rentalIsActive } from "./rental-status";

export const MAX_GROUP_RENTALS = 4;

export type GroupMemberSnapshot = {
  rentalId: string;
  workspaceId: string;
  agentProfileId: string;
  agentName: string;
  agentSlug: string;
  agentTier: string;
  status: string;
  endsAt: Date | null;
};

export function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function validateGroupRentalIds(ids: string[]) {
  const rentalIds = uniqueIds(ids);
  if (rentalIds.length < 2) {
    return {
      ok: false as const,
      error: "A group session needs at least two active rentals.",
      status: 400,
    };
  }
  if (rentalIds.length > MAX_GROUP_RENTALS) {
    return {
      ok: false as const,
      error: `A group session supports at most ${MAX_GROUP_RENTALS} rentals.`,
      status: 400,
    };
  }
  return { ok: true as const, rentalIds };
}

/**
 * Open a group session for 2–4 active rentals owned by the same user
 * in one workspace (Stripe-paid or staging unpaid_test). Host `rental_id`
 * is the first member (RLS anchor).
 */
export async function createGroupSession(input: {
  userId: string;
  rentalIds: string[];
}) {
  const parsed = validateGroupRentalIds(input.rentalIds);
  if (!parsed.ok) {
    return parsed;
  }
  const rentalIds = parsed.rentalIds;

  return withUserRls(input.userId, async (db) => {
    const rows = await db
      .select({
        rental: rentals,
        agentName: agentProfiles.name,
        agentSlug: agentProfiles.slug,
        agentTier: agentProfiles.tier,
      })
      .from(rentals)
      .innerJoin(agentProfiles, eq(rentals.agentProfileId, agentProfiles.id))
      .where(and(inArray(rentals.id, rentalIds), eq(rentals.userId, input.userId)));

    if (rows.length !== rentalIds.length) {
      return {
        ok: false as const,
        error: "Every rental must belong to the signed-in user.",
        status: 404,
      };
    }

    const workspaceId = rows[0]?.rental.workspaceId;
    for (const row of rows) {
      if (row.rental.workspaceId !== workspaceId) {
        return {
          ok: false as const,
          error: "Group members must share a workspace.",
          status: 400,
        };
      }
      const blocked = rentalAccessError(row.rental);
      if (blocked) {
        return {
          ok: false as const,
          error: `${row.agentName}: ${blocked.error}`,
          status: blocked.status,
        };
      }
      if (!rentalIsActive(row.rental)) {
        return {
          ok: false as const,
          error: `${row.agentName} is not an active paid rental.`,
          status: 409,
        };
      }
    }

    const host = rows.find((row) => row.rental.id === rentalIds[0]) ?? rows[0];
    const [session] = await db
      .insert(agentSessions)
      .values({
        rentalId: host.rental.id,
        workspaceId: host.rental.workspaceId,
        kind: "group",
        status: "open",
      })
      .returning();

    await db.insert(agentSessionMembers).values(
      rows.map((row) => ({
        sessionId: session.id,
        rentalId: row.rental.id,
      })),
    );

    return {
      ok: true as const,
      data: {
        session,
        members: rows.map((row) => ({
          rentalId: row.rental.id,
          workspaceId: row.rental.workspaceId,
          agentProfileId: row.rental.agentProfileId,
          agentName: row.agentName,
          agentSlug: row.agentSlug,
          agentTier: row.agentTier,
          status: row.rental.status,
          endsAt: row.rental.endsAt,
        })),
      },
    };
  });
}

export async function listGroupMembers(userId: string, sessionId: string) {
  return withUserRls(userId, async (db) => {
    const rows = await db
      .select({
        rental: rentals,
        agentName: agentProfiles.name,
        agentSlug: agentProfiles.slug,
        agentTier: agentProfiles.tier,
      })
      .from(agentSessionMembers)
      .innerJoin(rentals, eq(agentSessionMembers.rentalId, rentals.id))
      .innerJoin(agentProfiles, eq(rentals.agentProfileId, agentProfiles.id))
      .where(eq(agentSessionMembers.sessionId, sessionId))
      .orderBy(desc(agentSessionMembers.createdAt));
    return rows.map((row) => ({
      rentalId: row.rental.id,
      workspaceId: row.rental.workspaceId,
      agentProfileId: row.rental.agentProfileId,
      agentName: row.agentName,
      agentSlug: row.agentSlug,
      agentTier: row.agentTier,
      status: row.rental.status,
      endsAt: row.rental.endsAt,
      active: rentalIsActive(row.rental),
    }));
  });
}

export async function getSessionForUser(userId: string, sessionId: string) {
  return withUserRls(userId, async (db) => {
    const [session] = await db
      .select()
      .from(agentSessions)
      .where(eq(agentSessions.id, sessionId))
      .limit(1);
    return session ?? null;
  });
}

export function countRemainingMembers(
  rows: Array<{ sessionId: string }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.sessionId, (counts.get(row.sessionId) ?? 0) + 1);
  }
  return counts;
}

/** A group room needs at least two paid members. */
export function groupRoomsToClose(
  sessionIds: string[],
  remainingBySession: Map<string, number>,
): string[] {
  return sessionIds.filter((id) => (remainingBySession.get(id) ?? 0) < 2);
}

/**
 * Drop this rental from group rooms. Re-anchor `agent_sessions.rental_id`
 * when the host rental ended but two or more paid members remain. Close the
 * room when fewer than two remain. Does not close unrelated solo sessions.
 *
 * Call inside an existing `withUserRls` transaction (no nested global lock).
 */
export async function pruneGroupMembershipForRental(
  db: Database,
  rentalId: string,
  now = new Date(),
): Promise<{
  closedSessionIds: string[];
  remainingOpenSessionIds: string[];
}> {
  const memberRows = await db
    .select({ sessionId: agentSessionMembers.sessionId })
    .from(agentSessionMembers)
    .where(eq(agentSessionMembers.rentalId, rentalId));
  const sessionIds = [...new Set(memberRows.map((row) => row.sessionId))];
  if (sessionIds.length === 0) {
    return { closedSessionIds: [], remainingOpenSessionIds: [] };
  }

  await db
    .delete(agentSessionMembers)
    .where(
      and(
        eq(agentSessionMembers.rentalId, rentalId),
        inArray(agentSessionMembers.sessionId, sessionIds),
      ),
    );

  const remaining = await db
    .select({
      sessionId: agentSessionMembers.sessionId,
      rentalId: agentSessionMembers.rentalId,
    })
    .from(agentSessionMembers)
    .where(inArray(agentSessionMembers.sessionId, sessionIds));
  const remainingBySession = countRemainingMembers(remaining);
  const nextHostBySession = new Map<string, string>();
  for (const row of remaining) {
    if (!nextHostBySession.has(row.sessionId)) {
      nextHostBySession.set(row.sessionId, row.rentalId);
    }
  }

  const toClose = groupRoomsToClose(sessionIds, remainingBySession);
  const closed =
    toClose.length === 0
      ? []
      : await db
          .update(agentSessions)
          .set({ status: "closed", closedAt: now })
          .where(
            and(
              inArray(agentSessions.id, toClose),
              eq(agentSessions.status, "open"),
              eq(agentSessions.kind, "group"),
            ),
          )
          .returning({ id: agentSessions.id });

  const closedIds = new Set(closed.map((row) => row.id));
  const remainingOpenSessionIds = sessionIds.filter((id) => !closedIds.has(id));
  if (remainingOpenSessionIds.length > 0) {
    const hosted = await db
      .select({ id: agentSessions.id, rentalId: agentSessions.rentalId })
      .from(agentSessions)
      .where(
        and(
          inArray(agentSessions.id, remainingOpenSessionIds),
          eq(agentSessions.kind, "group"),
          eq(agentSessions.status, "open"),
        ),
      );
    for (const session of hosted) {
      if (session.rentalId !== rentalId) {
        continue;
      }
      const nextHost = nextHostBySession.get(session.id);
      if (!nextHost) {
        continue;
      }
      await db
        .update(agentSessions)
        .set({ rentalId: nextHost })
        .where(eq(agentSessions.id, session.id));
    }
  }

  return {
    closedSessionIds: [...closedIds],
    remainingOpenSessionIds,
  };
}

/** Close group rooms that include this rental; drop membership rows. */
export async function closeGroupSessionsForRental(
  userId: string,
  rentalId: string,
  now = new Date(),
) {
  return withUserRls(userId, async (db) => {
    const result = await pruneGroupMembershipForRental(db, rentalId, now);
    return { closedSessions: result.closedSessionIds.length };
  });
}

export function serializeSession(
  session: typeof agentSessions.$inferSelect,
  extra: { members?: Array<Record<string, unknown>> } = {},
) {
  return {
    id: session.id,
    rentalId: session.rentalId,
    workspaceId: session.workspaceId,
    kind: session.kind,
    status: session.status,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    members: extra.members ?? undefined,
  };
}
