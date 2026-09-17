import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

const globalForAuth = globalThis as unknown as {
  neonAuth?: NeonAuth;
};

export type AuthSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

function readAuthEnv(): { baseUrl: string; cookieSecret: string } | null {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();
  if (!baseUrl || !cookieSecret || cookieSecret.length < 32) {
    return null;
  }
  return { baseUrl, cookieSecret };
}

export function isNeonAuthConfigured(): boolean {
  return readAuthEnv() !== null;
}

/**
 * Lazy Neon Auth (Managed Better Auth) server instance.
 *
 * Constructed on first use so `next build` / CI can compile without secrets.
 * Session cookies are server-verified; do not trust a client-supplied user id.
 */
export function getAuth(): NeonAuth {
  if (globalForAuth.neonAuth) {
    return globalForAuth.neonAuth;
  }

  const env = readAuthEnv();
  if (!env) {
    throw new Error(
      "Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET (32+ chars).",
    );
  }

  globalForAuth.neonAuth = createNeonAuth({
    baseUrl: env.baseUrl,
    cookies: {
      secret: env.cookieSecret,
      // lax so Google OAuth callbacks can set the session cookie.
      sameSite: "lax",
    },
  });

  return globalForAuth.neonAuth;
}

function asSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const session = value as { user?: AuthSession["user"] };
  if (!session.user?.id) {
    return null;
  }

  return { user: session.user };
}

/**
 * Server-verified Neon Auth session, or null when signed out / unconfigured.
 * Never accept a user id from the client as a substitute for this.
 */
export async function getVerifiedSession(): Promise<AuthSession | null> {
  if (!isNeonAuthConfigured()) {
    return null;
  }

  try {
    const { data } = await getAuth().getSession();
    return asSession(data);
  } catch {
    return null;
  }
}

export async function getVerifiedUserId(): Promise<string | null> {
  const session = await getVerifiedSession();
  return session?.user.id ?? null;
}
