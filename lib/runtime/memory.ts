import { desc, eq } from "drizzle-orm";
import { withUserRls } from "@/lib/db";
import { memories } from "@/lib/db/schema";

export type MemoryKind = "note" | "transcript" | "fact" | "preference";
export type MemoryVisibility = "user" | "workspace";

/**
 * Shared learning network.
 *
 * Isolation:
 * - Every row is scoped to a workspace member (RLS: `is_workspace_member`).
 * - `visibility=user` (default): only the owning Neon Auth user can read/write.
 * - `visibility=workspace`: any member of that workspace can read; the writer
 *   still owns UPDATE/DELETE (`user_id` = self).
 *
 * Concurrency: each helper opens its own short `withUserRls` transaction
 * (SET LOCAL claims + one SELECT or INSERT). There is no session-level or
 * global advisory lock, so concurrent rented agents in the same workspace
 * do not serialize on a single memory lock.
 */
export async function listMemories(
  userId: string,
  workspaceId: string,
  limit = 20,
) {
  return withUserRls(userId, async (db) => {
    return db
      .select()
      .from(memories)
      .where(eq(memories.workspaceId, workspaceId))
      .orderBy(desc(memories.createdAt))
      .limit(Math.min(Math.max(limit, 1), 50));
  });
}

export async function writeMemory(input: {
  userId: string;
  workspaceId: string;
  sessionId?: string | null;
  kind?: MemoryKind;
  visibility?: MemoryVisibility;
  content: string;
}) {
  const content = input.content.trim();
  if (!content) {
    return { ok: false as const, error: "content is required", status: 400 };
  }
  const kind = input.kind ?? "note";
  const visibility = input.visibility === "workspace" ? "workspace" : "user";
  const [row] = await withUserRls(input.userId, async (db) => {
    return db
      .insert(memories)
      .values({
        workspaceId: input.workspaceId,
        userId: input.userId,
        sessionId: input.sessionId ?? null,
        kind,
        visibility,
        content,
      })
      .returning();
  });
  return { ok: true as const, data: row };
}

export function serializeMemory(row: typeof memories.$inferSelect) {
  return {
    id: row.id,
    kind: row.kind,
    visibility: row.visibility,
    content: row.content,
    sessionId: row.sessionId,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Search helper used by tools — still one short RLS transaction. */
export async function searchMemories(input: {
  userId: string;
  workspaceId: string;
  query?: string;
  limit?: number;
}) {
  const rows = await listMemories(input.userId, input.workspaceId, input.limit ?? 12);
  const query = input.query?.trim().toLowerCase();
  if (!query) {
    return rows;
  }
  return rows.filter((row) => row.content.toLowerCase().includes(query));
}

export function isMemoryKind(value: string): value is MemoryKind {
  return value === "note" || value === "transcript" || value === "fact" || value === "preference";
}

export function isMemoryVisibility(value: string): value is MemoryVisibility {
  return value === "user" || value === "workspace";
}
