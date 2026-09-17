import { desc, eq, sql } from "drizzle-orm";
import { withUserRls } from "@/lib/db";
import {
  networkEdges,
  networkNodes,
  skillLearningEvents,
} from "@/lib/db/schema";
import type { AgentTier } from "@/lib/catalog/constants";

export const NETWORK_PUBLISH_TIERS: readonly AgentTier[] = [
  "expert",
  "elite",
  "frontier",
];

export function canPublishVerified(tier: AgentTier): boolean {
  return NETWORK_PUBLISH_TIERS.includes(tier);
}

/** Truncate to a summary. Never persist a full chat dump on the mesh. */
export function summarizeForNetwork(text: string, max = 480): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) {
    return collapsed;
  }
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}

export function titleFromSummary(summary: string): string {
  const first = summary.split(/[.!?]/)[0]?.trim() || "learning";
  return first.slice(0, 80);
}

/**
 * Enqueue a learning event. Does not wait on the mesh lock.
 * Concurrent agents insert independently; claim uses SKIP LOCKED.
 */
export async function enqueueSkillLearning(input: {
  userId: string;
  workspaceId: string;
  sessionId?: string | null;
  rentalId?: string | null;
  agentProfileId?: string | null;
  publisherTier: AgentTier;
  summary: string;
}): Promise<{ queued: boolean; eventId?: string }> {
  const summary = summarizeForNetwork(input.summary);
  if (!summary) {
    return { queued: false };
  }
  const verified = canPublishVerified(input.publisherTier);
  const [row] = await withUserRls(input.userId, async (db) => {
    return db
      .insert(skillLearningEvents)
      .values({
        workspaceId: input.workspaceId,
        userId: input.userId,
        sourceSessionId: input.sessionId ?? null,
        sourceRentalId: input.rentalId ?? null,
        agentProfileId: input.agentProfileId ?? null,
        publisherTier: input.publisherTier,
        status: "queued",
        summary,
        verified,
      })
      .returning();
  });
  return { queued: true, eventId: row?.id };
}

/**
 * Claim the next queued event for this workspace without waiting.
 * pg_try_advisory_xact_lock + FOR UPDATE SKIP LOCKED: no deadlock, no starve.
 */
export async function drainSkillLearningQueue(
  userId: string,
  workspaceId: string,
  limit = 4,
): Promise<number> {
  let published = 0;
  for (let i = 0; i < limit; i += 1) {
    const claimed = await withUserRls(userId, async (db) => {
      await db.execute(
        sql`select pg_try_advisory_xact_lock(hashtext(${workspaceId}::text))`,
      );
      const picked = await db.execute(sql`
        with claimed as (
          select id
          from skill_learning_events
          where workspace_id = ${workspaceId}::uuid
            and status = 'queued'
          order by created_at
          for update skip locked
          limit 1
        )
        update skill_learning_events as e
        set status = 'publishing'
        from claimed
        where e.id = claimed.id
        returning e.id, e.workspace_id, e.user_id, e.summary, e.verified, e.publisher_tier
      `);
      const rows = picked as unknown as Array<{
        id: string;
        workspace_id: string;
        user_id: string;
        summary: string;
        verified: boolean;
        publisher_tier: AgentTier;
      }>;
      return rows[0] ?? null;
    });

    if (!claimed) {
      break;
    }

    const title = titleFromSummary(claimed.summary);
    await withUserRls(userId, async (db) => {
      await db
        .insert(networkNodes)
        .values({
          workspaceId: claimed.workspace_id,
          userId: claimed.user_id,
          kind: "summary",
          title,
          summary: claimed.summary,
          sourceEventId: claimed.id,
          publisherTier: claimed.publisher_tier,
          verified: claimed.verified,
        })
        .onConflictDoUpdate({
          target: [
            networkNodes.workspaceId,
            networkNodes.kind,
            networkNodes.title,
          ],
          set: {
            summary: claimed.summary,
            sourceEventId: claimed.id,
            publisherTier: claimed.publisher_tier,
            verified: sql`${networkNodes.verified} or ${claimed.verified}`,
          },
        });

      await db
        .update(skillLearningEvents)
        .set({ status: "published" })
        .where(eq(skillLearningEvents.id, claimed.id));
    });
    published += 1;
  }
  return published;
}

export async function listNetworkSummaries(
  userId: string,
  workspaceId: string,
  limit = 12,
) {
  return withUserRls(userId, async (db) => {
    const nodes = await db
      .select({
        id: networkNodes.id,
        kind: networkNodes.kind,
        title: networkNodes.title,
        summary: networkNodes.summary,
        verified: networkNodes.verified,
        publisherTier: networkNodes.publisherTier,
        createdAt: networkNodes.createdAt,
      })
      .from(networkNodes)
      .where(eq(networkNodes.workspaceId, workspaceId))
      .orderBy(desc(networkNodes.createdAt))
      .limit(Math.min(Math.max(limit, 1), 50));

    const edges = await db
      .select({
        id: networkEdges.id,
        fromNodeId: networkEdges.fromNodeId,
        toNodeId: networkEdges.toNodeId,
        kind: networkEdges.kind,
      })
      .from(networkEdges)
      .where(eq(networkEdges.workspaceId, workspaceId))
      .limit(100);

    return { nodes, edges };
  });
}

export function serializeNetworkNode(node: {
  id: string;
  kind: string;
  title: string;
  summary: string;
  verified: boolean;
  publisherTier: string;
  createdAt: Date;
}) {
  return {
    id: node.id,
    kind: node.kind,
    title: node.title,
    summary: node.summary,
    verified: node.verified,
    publisherTier: node.publisherTier,
    createdAt: node.createdAt.toISOString(),
  };
}
