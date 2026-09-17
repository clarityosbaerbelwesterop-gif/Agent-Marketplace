import { and, desc, eq } from "drizzle-orm";
import { parseSkillRef } from "@/lib/catalog/queries";
import { withUserRls } from "@/lib/db";
import {
  agentProfiles,
  agentRuns,
  agentSessions,
  agentSkills,
  memories,
  rentals,
} from "@/lib/db/schema";
import { modelsForAlias, normalizeAlias } from "@/lib/unorouter/aliases";
import type { ChatMessage } from "@/lib/unorouter/types";
import { listConnectorGrants, mergeConnectorStatus } from "./connectors";
import { connectorCatalog } from "@/lib/connectors";
import { getOrCreateOpenSession } from "./runs";
import { rentalAccessError } from "./rental-status";
import type { RuntimeContext } from "./types";

function historyFromRuns(
  rows: Array<{
    status: string;
    input: { message?: unknown } | null;
    output: { text?: unknown } | null;
  }>,
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const row of rows) {
    const input = row.input;
    const output = row.output;
    if (input && typeof input.message === "string" && input.message.trim()) {
      messages.push({ role: "user", content: input.message });
    }
    if (
      row.status === "succeeded" &&
      output &&
      typeof output.text === "string" &&
      output.text.trim()
    ) {
      messages.push({ role: "assistant", content: output.text });
    }
  }
  return messages.slice(-16);
}

export async function loadRuntimeContext(input: {
  userId: string;
  rentalId?: string;
  sessionId?: string;
}): Promise<
  { ok: true; data: RuntimeContext } | { ok: false; error: string; status: number }
> {
  if (!input.rentalId && !input.sessionId) {
    return {
      ok: false,
      error: "rentalId or sessionId is required",
      status: 400,
    };
  }

  const sessionResult = await withUserRls(input.userId, async (db) => {
    let rentalId = input.rentalId;
    if (!rentalId && input.sessionId) {
      const [session] = await db
        .select()
        .from(agentSessions)
        .where(eq(agentSessions.id, input.sessionId))
        .limit(1);
      if (!session) {
        return { ok: false as const, error: "Session not found", status: 404 };
      }
      rentalId = session.rentalId;
    }
    if (!rentalId) {
      return { ok: false as const, error: "rentalId is required", status: 400 };
    }

    const [bundle] = await db
      .select({
        rental: rentals,
        agent: agentProfiles,
      })
      .from(rentals)
      .innerJoin(agentProfiles, eq(rentals.agentProfileId, agentProfiles.id))
      .where(eq(rentals.id, rentalId))
      .limit(1);
    if (!bundle) {
      return { ok: false as const, error: "Rental not found", status: 404 };
    }
    const blocked = rentalAccessError(bundle.rental);
    if (blocked) {
      return {
        ok: false as const,
        error: blocked.error,
        status: blocked.status,
      };
    }
    return { ok: true as const, data: bundle, rentalId };
  });

  if (!sessionResult.ok) {
    return sessionResult;
  }

  const opened = await getOrCreateOpenSession({
    userId: input.userId,
    rentalId: sessionResult.rentalId,
    sessionId: input.sessionId,
  });
  if (!opened.ok) {
    return opened;
  }

  const { rental, session } = opened.data;
  const agent = sessionResult.data.agent;
  const alias = normalizeAlias(agent.modelAlias ?? agent.tier);

  const extra = await withUserRls(input.userId, async (db) => {
    const ref = parseSkillRef(agent.skillPackageVersion);
    const skill = ref
      ? (
          await db
            .select()
            .from(agentSkills)
            .where(
              and(
                eq(agentSkills.slug, ref.slug),
                eq(agentSkills.version, ref.version),
                eq(agentSkills.published, true),
              ),
            )
            .limit(1)
        )[0] ?? null
      : null;

    const memoryRows = await db
      .select()
      .from(memories)
      .where(eq(memories.workspaceId, rental.workspaceId))
      .orderBy(desc(memories.createdAt))
      .limit(8);

    const runRows = await db
      .select({
        status: agentRuns.status,
        input: agentRuns.input,
        output: agentRuns.output,
      })
      .from(agentRuns)
      .where(eq(agentRuns.sessionId, session.id))
      .orderBy(agentRuns.createdAt)
      .limit(24);

    return { skill, memoryRows, runRows };
  });

  const connectorGrants = await listConnectorGrants(
    input.userId,
    rental.workspaceId,
  );

  return {
    ok: true,
    data: {
      userId: input.userId,
      rental,
      session,
      agent,
      skill: extra.skill,
      alias,
      modelIds: modelsForAlias(alias),
      memories: extra.memoryRows
        .filter((row) => row.userId === input.userId)
        .map((row) => ({
          id: row.id,
          kind: row.kind,
          content: row.content,
          createdAt: row.createdAt.toISOString(),
        })),
      history: historyFromRuns(extra.runRows),
      connectorGrants,
    },
  };
}

export async function connectorsForContext(context: RuntimeContext) {
  const grants =
    context.connectorGrants ??
    (await listConnectorGrants(context.userId, context.rental.workspaceId));
  return {
    catalog: connectorCatalog(grants),
    agentRequested: mergeConnectorStatus(context.agent.connectors ?? [], grants),
  };
}
