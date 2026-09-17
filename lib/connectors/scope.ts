import { eq } from "drizzle-orm";
import { withUserRls } from "@/lib/db";
import { agentSessions, rentals, workspaces } from "@/lib/db/schema";
import { rentalIsActive } from "@/lib/runtime/rentals";
import type { ConnectorScope } from "./types";

export async function resolveConnectorScope(input: {
  userId: string;
  rentalId?: string;
  sessionId?: string;
  workspaceId?: string;
}): Promise<
  { ok: true; data: ConnectorScope } | { ok: false; error: string; status: number }
> {
  const rentalId = input.rentalId?.trim() || undefined;
  const sessionId = input.sessionId?.trim() || undefined;
  const workspaceId = input.workspaceId?.trim() || undefined;

  if (!rentalId && !sessionId && !workspaceId) {
    return {
      ok: false,
      error: "rentalId, sessionId, or workspaceId is required",
      status: 400,
    };
  }

  return withUserRls(input.userId, async (db) => {
    if (rentalId || sessionId) {
      let resolvedRentalId = rentalId;
      if (!resolvedRentalId && sessionId) {
        const [session] = await db
          .select()
          .from(agentSessions)
          .where(eq(agentSessions.id, sessionId))
          .limit(1);
        if (!session) {
          return { ok: false as const, error: "Session not found", status: 404 };
        }
        resolvedRentalId = session.rentalId;
      }
      if (!resolvedRentalId) {
        return { ok: false as const, error: "rentalId is required", status: 400 };
      }
      const [rental] = await db
        .select()
        .from(rentals)
        .where(eq(rentals.id, resolvedRentalId))
        .limit(1);
      if (!rental) {
        return { ok: false as const, error: "Rental not found", status: 404 };
      }
      if (!rentalIsActive(rental)) {
        return {
          ok: false as const,
          error: "Rental is not active",
          status: 409,
        };
      }
      return {
        ok: true as const,
        data: {
          workspaceId: rental.workspaceId,
          rentalId: rental.id,
          sessionId: sessionId ?? null,
        },
      };
    }

    const [workspace] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId!))
      .limit(1);
    if (!workspace) {
      return { ok: false as const, error: "Workspace not found", status: 404 };
    }
    return {
      ok: true as const,
      data: {
        workspaceId: workspace.id,
        rentalId: null,
        sessionId: null,
      },
    };
  });
}
