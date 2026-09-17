import { sql as drizzleSql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { createSql } from "./client";
import type { Database } from "./client";
import * as schema from "./schema";

const globalForRls = globalThis as unknown as {
  marketplaceRlsSql?: ReturnType<typeof createSql>;
  marketplaceRlsDb?: Database;
};

function requireRlsDatabaseUrl(): string {
  const url =
    process.env.DATABASE_AUTHENTICATED_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. For RLS-scoped queries prefer DATABASE_AUTHENTICATED_URL (no BYPASSRLS).",
    );
  }
  return url;
}

function getRlsDb(): Database {
  if (!globalForRls.marketplaceRlsDb) {
    globalForRls.marketplaceRlsSql = createSql(requireRlsDatabaseUrl(), 5);
    globalForRls.marketplaceRlsDb = drizzle(globalForRls.marketplaceRlsSql, {
      schema,
    });
  }
  return globalForRls.marketplaceRlsDb;
}

export type JwtClaims = {
  sub: string;
  role?: string;
};

function applyRlsClaims<T>(
  claims: JwtClaims,
  callback: (db: Database) => Promise<T>,
): Promise<T> {
  const db = getRlsDb();
  const payload = JSON.stringify({ role: "authenticated" as const, ...claims });

  return db.transaction(async (tx) => {
    await tx.execute(
      drizzleSql`select set_config('request.jwt.claims', ${payload}, true)`,
    );
    await tx.execute(drizzleSql`set local role authenticated`);
    return callback(tx as unknown as Database);
  });
}

/**
 * Run `callback` with Postgres RLS applied for a Neon Auth user.
 *
 * Sets `request.jwt.claims` (Better Auth / Data API compatible: `sub` is
 * `neon_auth.user.id`) and `SET LOCAL ROLE authenticated` inside a transaction.
 *
 * Pass only a user id already verified by Neon Auth on the Next.js server.
 * Do not trust a client-supplied id.
 */
export async function withUserRls<T>(
  userId: string,
  callback: (db: Database) => Promise<T>,
): Promise<T> {
  if (!userId) {
    throw new Error("withUserRls requires a Neon Auth user id");
  }

  return applyRlsClaims({ sub: userId }, callback);
}

/**
 * Same as `withUserRls`, but accepts a full JWT payload (must include `sub`).
 * Next.js should verify the token against Neon Auth JWKS before calling this.
 */
export async function withJwtClaims<T>(
  claims: JwtClaims,
  callback: (db: Database) => Promise<T>,
): Promise<T> {
  if (!claims.sub) {
    throw new Error("JWT claims must include sub (Neon Auth user id)");
  }
  return applyRlsClaims(claims, callback);
}
