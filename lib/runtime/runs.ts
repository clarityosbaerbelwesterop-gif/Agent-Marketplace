import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { withUserRls } from "@/lib/db";
import {
  agentProfiles,
  agentRuns,
  agentSessions,
  rentals,
} from "@/lib/db/schema";
import type { JsonObject } from "@/lib/db/json";
import type { ChatUsage } from "@/lib/unorouter/types";
import { rentalAccessError } from "./rental-status";

export async function getOrCreateOpenSession(input: {
  userId: string;
  rentalId: string;
  sessionId?: string;
}) {
  return withUserRls(input.userId, async (db) => {
    const [rental] = await db
      .select()
      .from(rentals)
      .where(eq(rentals.id, input.rentalId))
      .limit(1);
    if (!rental) {
      return { ok: false as const, error: "Rental not found", status: 404 };
    }
    const blocked = rentalAccessError(rental);
    if (blocked) {
      return { ok: false as const, error: blocked.error, status: blocked.status };
    }

    if (input.sessionId) {
      const [existing] = await db
        .select()
        .from(agentSessions)
        .where(
          and(
            eq(agentSessions.id, input.sessionId),
            eq(agentSessions.rentalId, input.rentalId),
          ),
        )
        .limit(1);
      if (!existing) {
        return { ok: false as const, error: "Session not found", status: 404 };
      }
      if (existing.status === "closed") {
        return { ok: false as const, error: "Session is closed", status: 409 };
      }
      return { ok: true as const, data: { rental, session: existing } };
    }

    const [open] = await db
      .select()
      .from(agentSessions)
      .where(
        and(
          eq(agentSessions.rentalId, input.rentalId),
          eq(agentSessions.status, "open"),
          eq(agentSessions.kind, "solo"),
        ),
      )
      .orderBy(desc(agentSessions.openedAt))
      .limit(1);
    if (open) {
      return { ok: true as const, data: { rental, session: open } };
    }

    const [created] = await db
      .insert(agentSessions)
      .values({
        rentalId: rental.id,
        workspaceId: rental.workspaceId,
        kind: "solo",
        status: "open",
      })
      .returning();
    return { ok: true as const, data: { rental, session: created } };
  });
}

export async function listSessionRuns(userId: string, sessionId: string) {
  return withUserRls(userId, async (db) => {
    return db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.sessionId, sessionId))
      .orderBy(agentRuns.createdAt);
  });
}

export async function getRunForUser(userId: string, runId: string) {
  return withUserRls(userId, async (db) => {
    const [row] = await db
      .select({
        run: agentRuns,
        session: agentSessions,
        rental: rentals,
        agentSlug: agentProfiles.slug,
        agentName: agentProfiles.name,
      })
      .from(agentRuns)
      .innerJoin(agentSessions, eq(agentRuns.sessionId, agentSessions.id))
      .innerJoin(rentals, eq(agentSessions.rentalId, rentals.id))
      .innerJoin(agentProfiles, eq(rentals.agentProfileId, agentProfiles.id))
      .where(eq(agentRuns.id, runId))
      .limit(1);
    return row ?? null;
  });
}

export async function createQueuedRun(input: {
  userId: string;
  sessionId: string;
  modelIdUsed: string;
  providerUsed?: string | null;
  skillVersion: string | null;
  payload: JsonObject;
}) {
  return withUserRls(input.userId, async (db) => {
    const [run] = await db
      .insert(agentRuns)
      .values({
        sessionId: input.sessionId,
        status: "queued",
        modelIdUsed: input.modelIdUsed,
        providerUsed: input.providerUsed ?? null,
        skillVersion: input.skillVersion,
        input: input.payload,
      })
      .returning();
    return run;
  });
}

export async function updateRun(
  userId: string,
  runId: string,
  patch: {
    status?: "queued" | "running" | "succeeded" | "failed" | "canceled";
    modelIdUsed?: string;
    providerUsed?: string | null;
    output?: JsonObject | null;
    usage?: ChatUsage | null;
    finished?: boolean;
  },
) {
  return withUserRls(userId, async (db) => {
    const values: Partial<typeof agentRuns.$inferInsert> = {};
    if (patch.status) {
      values.status = patch.status;
    }
    if (patch.modelIdUsed) {
      values.modelIdUsed = patch.modelIdUsed;
    }
    if (patch.providerUsed !== undefined) {
      values.providerUsed = patch.providerUsed;
    }
    if (patch.output !== undefined) {
      values.output = patch.output;
    }
    if (patch.usage) {
      values.promptTokens = patch.usage.promptTokens;
      values.completionTokens = patch.usage.completionTokens;
      values.totalTokens = patch.usage.totalTokens;
      values.costUsd =
        patch.usage.costUsd == null ? null : patch.usage.costUsd.toFixed(6);
    }
    if (patch.finished) {
      values.finishedAt = new Date();
    }
    const [row] = await db
      .update(agentRuns)
      .set(values)
      .where(
        patch.status === "succeeded" || patch.status === "failed"
          ? and(
              eq(agentRuns.id, runId),
              inArray(agentRuns.status, ["queued", "running"]),
            )
          : eq(agentRuns.id, runId),
      )
      .returning();
    return row;
  });
}

export async function addUsageToRental(
  userId: string,
  rentalId: string,
  tokens: number,
) {
  if (tokens <= 0) {
    return;
  }
  await withUserRls(userId, async (db) => {
    await db
      .update(rentals)
      .set({
        usageConsumed: sql`${rentals.usageConsumed} + ${tokens}`,
      })
      .where(eq(rentals.id, rentalId));
  });
}

export class RunCanceledError extends Error {
  readonly code = "rental_ended";
  constructor(message = "Rental has ended") {
    super(message);
    this.name = "RunCanceledError";
  }
}

export async function claimQueuedRun(userId: string, runId: string) {
  return withUserRls(userId, async (db) => {
    const [row] = await db
      .update(agentRuns)
      .set({ status: "running" })
      .where(and(eq(agentRuns.id, runId), eq(agentRuns.status, "queued")))
      .returning();
    return row ?? null;
  });
}

export async function assertRunStillOpen(userId: string, runId: string) {
  const row = await getRunForUser(userId, runId);
  if (!row) {
    throw new RunCanceledError("Run not found");
  }
  if (row.run.status === "canceled") {
    throw new RunCanceledError();
  }
  const payload = row.run.input as { rentalId?: unknown } | null;
  const memberRentalId =
    payload && typeof payload.rentalId === "string" ? payload.rentalId : null;
  if (memberRentalId && memberRentalId !== row.rental.id) {
    const member = await withUserRls(userId, async (db) => {
      const [found] = await db
        .select()
        .from(rentals)
        .where(eq(rentals.id, memberRentalId))
        .limit(1);
      return found ?? null;
    });
    if (!member) {
      throw new RunCanceledError("Rental not found");
    }
    const blockedMember = rentalAccessError(member);
    if (blockedMember) {
      throw new RunCanceledError(blockedMember.error);
    }
    return;
  }
  const blocked = rentalAccessError(row.rental);
  if (blocked) {
    throw new RunCanceledError(blocked.error);
  }
}

export function serializeRun(run: typeof agentRuns.$inferSelect) {
  return {
    id: run.id,
    sessionId: run.sessionId,
    status: run.status,
    modelIdUsed: run.modelIdUsed,
    providerUsed: run.providerUsed,
    skillVersion: run.skillVersion,
    input: run.input,
    output: run.output,
    promptTokens: run.promptTokens,
    completionTokens: run.completionTokens,
    totalTokens: run.totalTokens,
    costUsd: run.costUsd,
    createdAt: run.createdAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}
