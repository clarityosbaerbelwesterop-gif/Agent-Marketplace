import { and, desc, eq, inArray } from "drizzle-orm";
import { withUserRls } from "@/lib/db";
import {
  agentProfiles,
  agentRoomMembers,
  agentRoomMessages,
  agentRooms,
  agentRuns,
  rentals,
} from "@/lib/db/schema";
import { rentalIsActive } from "./rental-status";
import { getOrCreateOpenSession } from "./runs";

export const MAX_ROOM_MEMBERS = 6;

export function uniqueIds(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const id = value.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

export async function listRooms(userId: string) {
  return withUserRls(userId, async (db) => {
    const rooms = await db
      .select()
      .from(agentRooms)
      .where(eq(agentRooms.ownerUserId, userId))
      .orderBy(desc(agentRooms.createdAt));
    return rooms;
  });
}

export async function getRoomForUser(userId: string, roomId: string) {
  return withUserRls(userId, async (db) => {
    const [room] = await db
      .select()
      .from(agentRooms)
      .where(eq(agentRooms.id, roomId))
      .limit(1);
    if (!room) {
      return null;
    }
    const members = await db
      .select({
        rentalId: agentRoomMembers.rentalId,
        sessionId: agentRoomMembers.sessionId,
        agentProfileId: agentRoomMembers.agentProfileId,
        agentName: agentProfiles.name,
        agentSlug: agentProfiles.slug,
        rentalStatus: rentals.status,
        rentalEndsAt: rentals.endsAt,
        rentalStartsAt: rentals.startsAt,
      })
      .from(agentRoomMembers)
      .innerJoin(rentals, eq(agentRoomMembers.rentalId, rentals.id))
      .innerJoin(agentProfiles, eq(agentRoomMembers.agentProfileId, agentProfiles.id))
      .where(eq(agentRoomMembers.roomId, roomId));

    const messages = await db
      .select()
      .from(agentRoomMessages)
      .where(eq(agentRoomMessages.roomId, roomId))
      .orderBy(agentRoomMessages.createdAt)
      .limit(200);

    return { room, members, messages };
  });
}

export async function loadActiveOwnedRentals(userId: string, rentalIds: string[]) {
  const ids = uniqueIds(rentalIds);
  if (ids.length === 0) {
    return { ok: false as const, error: "rentalIds is required", status: 400 };
  }
  if (ids.length > MAX_ROOM_MEMBERS) {
    return {
      ok: false as const,
      error: `A room supports at most ${MAX_ROOM_MEMBERS} active rentals`,
      status: 400,
    };
  }

  const rows = await withUserRls(userId, async (db) => {
    return db
      .select({
        rental: rentals,
        agent: agentProfiles,
      })
      .from(rentals)
      .innerJoin(agentProfiles, eq(rentals.agentProfileId, agentProfiles.id))
      .where(and(eq(rentals.userId, userId), inArray(rentals.id, ids)));
  });

  if (rows.length !== ids.length) {
    return {
      ok: false as const,
      error: "Every rentalId must be an owned rental",
      status: 404,
    };
  }

  const inactive = rows.filter((row) => !rentalIsActive(row.rental));
  if (inactive.length > 0) {
    return {
      ok: false as const,
      error: "Every member must be an active rental",
      status: 409,
    };
  }

  const workspaceId = rows[0]?.rental.workspaceId;
  if (!workspaceId || rows.some((row) => row.rental.workspaceId !== workspaceId)) {
    return {
      ok: false as const,
      error: "Room members must share one workspace",
      status: 400,
    };
  }

  return { ok: true as const, rows, workspaceId };
}

export async function createRoom(input: {
  userId: string;
  title: string;
  rentalIds: string[];
}) {
  const title = input.title.trim().slice(0, 120) || "Agent room";
  const loaded = await loadActiveOwnedRentals(input.userId, input.rentalIds);
  if (!loaded.ok) {
    return loaded;
  }
  if (loaded.rows.length < 2) {
    return {
      ok: false as const,
      error: "A room needs at least two active rentals",
      status: 400,
    };
  }

  const memberPayload: Array<{
    rentalId: string;
    sessionId: string;
    agentProfileId: string;
  }> = [];
  for (const row of loaded.rows) {
    const opened = await getOrCreateOpenSession({
      userId: input.userId,
      rentalId: row.rental.id,
    });
    if (!opened.ok) {
      return opened;
    }
    memberPayload.push({
      rentalId: row.rental.id,
      sessionId: opened.data.session.id,
      agentProfileId: row.agent.id,
    });
  }

  const created = await withUserRls(input.userId, async (db) => {
    const [room] = await db
      .insert(agentRooms)
      .values({
        workspaceId: loaded.workspaceId,
        ownerUserId: input.userId,
        title,
        status: "open",
      })
      .returning();
    await db.insert(agentRoomMembers).values(
      memberPayload.map((member) => ({
        roomId: room.id,
        rentalId: member.rentalId,
        sessionId: member.sessionId,
        agentProfileId: member.agentProfileId,
      })),
    );
    return room;
  });

  return { ok: true as const, data: created };
}

export async function addRoomMember(input: {
  userId: string;
  roomId: string;
  rentalId: string;
}) {
  const bundle = await getRoomForUser(input.userId, input.roomId);
  if (!bundle) {
    return { ok: false as const, error: "Room not found", status: 404 };
  }
  if (bundle.room.ownerUserId !== input.userId) {
    return { ok: false as const, error: "Only the room owner can add members", status: 403 };
  }
  if (bundle.room.status !== "open") {
    return { ok: false as const, error: "Room is closed", status: 409 };
  }
  if (bundle.members.some((member) => member.rentalId === input.rentalId)) {
    return { ok: true as const, data: bundle.room };
  }
  if (bundle.members.length >= MAX_ROOM_MEMBERS) {
    return {
      ok: false as const,
      error: `A room supports at most ${MAX_ROOM_MEMBERS} active rentals`,
      status: 400,
    };
  }

  const loaded = await loadActiveOwnedRentals(input.userId, [input.rentalId]);
  if (!loaded.ok) {
    return loaded;
  }
  if (loaded.workspaceId !== bundle.room.workspaceId) {
    return {
      ok: false as const,
      error: "Member rental must be in the room workspace",
      status: 400,
    };
  }
  const opened = await getOrCreateOpenSession({
    userId: input.userId,
    rentalId: input.rentalId,
  });
  if (!opened.ok) {
    return opened;
  }
  await withUserRls(input.userId, async (db) => {
    await db.insert(agentRoomMembers).values({
      roomId: input.roomId,
      rentalId: input.rentalId,
      sessionId: opened.data.session.id,
      agentProfileId: loaded.rows[0].agent.id,
    });
  });
  return { ok: true as const, data: bundle.room };
}

export async function removeRoomMember(input: {
  userId: string;
  roomId: string;
  rentalId: string;
}) {
  const bundle = await getRoomForUser(input.userId, input.roomId);
  if (!bundle) {
    return { ok: false as const, error: "Room not found", status: 404 };
  }
  if (bundle.room.ownerUserId !== input.userId) {
    return { ok: false as const, error: "Only the room owner can remove members", status: 403 };
  }
  if (bundle.members.length <= 2) {
    return {
      ok: false as const,
      error: "A room needs at least two members",
      status: 400,
    };
  }
  await withUserRls(input.userId, async (db) => {
    await db
      .delete(agentRoomMembers)
      .where(
        and(
          eq(agentRoomMembers.roomId, input.roomId),
          eq(agentRoomMembers.rentalId, input.rentalId),
        ),
      );
  });
  return { ok: true as const };
}

export async function insertRoomMessage(input: {
  userId: string;
  roomId: string;
  authorKind: "user" | "agent" | "system";
  content: string;
  rentalId?: string | null;
  runId?: string | null;
  status?: string;
}) {
  const content = input.content.trim();
  const [row] = await withUserRls(input.userId, async (db) => {
    return db
      .insert(agentRoomMessages)
      .values({
        roomId: input.roomId,
        authorKind: input.authorKind,
        content: content || "…",
        rentalId: input.rentalId ?? null,
        runId: input.runId ?? null,
        status: input.status ?? "complete",
      })
      .returning();
  });
  return row;
}

export async function patchRoomMessage(
  userId: string,
  messageId: string,
  patch: { content?: string; status?: string; runId?: string | null },
) {
  return withUserRls(userId, async (db) => {
    const [row] = await db
      .update(agentRoomMessages)
      .set({
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.runId !== undefined ? { runId: patch.runId } : {}),
      })
      .where(eq(agentRoomMessages.id, messageId))
      .returning();
    return row;
  });
}

export function roomTurnPrompt(input: {
  userMessage: string;
  agentName: string;
  peerNames: string[];
}): string {
  return [
    `Group room turn. You are ${input.agentName}.`,
    `Other agents in this room (they reply in parallel, once): ${input.peerNames.join(", ") || "none"}.`,
    "Reply once to the user. Do not address other agents, do not request another round, and do not loop.",
    "Ground claims in tools or memory. Say unknown when unknown.",
    `User: ${input.userMessage}`,
  ].join("\n");
}

export function serializeRoomMessage(row: typeof agentRoomMessages.$inferSelect) {
  return {
    id: row.id,
    roomId: row.roomId,
    authorKind: row.authorKind,
    rentalId: row.rentalId,
    runId: row.runId,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function workingRunsForRoom(
  userId: string,
  runIds: string[],
) {
  const ids = runIds.filter(Boolean);
  if (ids.length === 0) {
    return [];
  }
  return withUserRls(userId, async (db) => {
    return db
      .select({
        id: agentRuns.id,
        status: agentRuns.status,
        modelIdUsed: agentRuns.modelIdUsed,
      })
      .from(agentRuns)
      .where(inArray(agentRuns.id, ids));
  });
}
