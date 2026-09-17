import { drizzle } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import { createSql } from "./client";
import type { Database } from "./client";
import * as schema from "./schema";

const globalForRls = globalThis as unknown as {
  marketplaceRlsSql?: ReturnType<typeof createSql>;
};

function requireRlsDatabaseUrl(): string {
  const url =
    process.env.DATABASE_AUTHENTICATED_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. For RLS-scoped queries prefer DATABASE_AUTHENTICATED_URL (no BYPASSRLS).",
    );
  }
  return url;
}

function getRlsSql() {
  if (!globalForRls.marketplaceRlsSql) {
    globalForRls.marketplaceRlsSql = createSql(requireRlsDatabaseUrl(), 5);
  }
  return globalForRls.marketplaceRlsSql;
}

export type JwtClaims = {
  sub: string;
  role?: string;
};

function applyRlsClaims<T>(
  claims: JwtClaims,
  callback: (db: Database) => Promise<T>,
): Promise<T> {
  const sql = getRlsSql();
  const payload = { role: "authenticated" as const, ...claims };

  return sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify(payload)}, true)`;
    await tx`set local role authenticated`;
    const db = drizzle(tx as unknown as Sql, { schema });
    return callback(db as Database);
  }) as Promise<T>;
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
