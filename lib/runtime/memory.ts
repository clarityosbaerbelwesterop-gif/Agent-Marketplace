import { desc, eq } from "drizzle-orm";
import { withUserRls } from "@/lib/db";
import { memories } from "@/lib/db/schema";

export type MemoryKind = "note" | "transcript" | "fact" | "preference";

export async function listMemories(
  userId: string,
  workspaceId: string,
  limit = 20,
) {
  return withUserRls(userId, async (db) => {
    const rows = await db
      .select()
      .from(memories)
      .where(eq(memories.workspaceId, workspaceId))
      .orderBy(desc(memories.createdAt))
      .limit(Math.min(Math.max(limit, 1), 50));
    return rows.filter((row) => row.userId === userId);
  });
}

export async function writeMemory(input: {
  userId: string;
  workspaceId: string;
  sessionId?: string | null;
  kind?: MemoryKind;
  content: string;
}) {
  const content = input.content.trim();
  if (!content) {
    return { ok: false as const, error: "content is required", status: 400 };
  }
  const kind = input.kind ?? "note";
  const [row] = await withUserRls(input.userId, async (db) => {
    return db
      .insert(memories)
      .values({
        workspaceId: input.workspaceId,
        userId: input.userId,
        sessionId: input.sessionId ?? null,
        kind,
        content,
      })
      .returning();
  });
  return { ok: true as const, data: row };
}
