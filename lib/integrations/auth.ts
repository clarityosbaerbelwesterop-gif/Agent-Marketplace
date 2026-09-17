import type { AuthSession } from "@/types/auth";

/**
 * TODO: Wire Neon Auth (Managed Better Auth).
 * Do not add a second auth library. This helper always returns a signed-out shell.
 */
export async function getAuthSession(): Promise<AuthSession> {
  return { user: null };
}
