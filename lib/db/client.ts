import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

type PostgresClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  marketplaceSql?: PostgresClient;
  marketplaceDb?: Database;
};

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and use the pooled Neon URI.",
    );
  }
  return url;
}

function createSql(url: string, max: number): PostgresClient {
  return postgres(url, {
    max,
    // Neon PgBouncer (transaction pooling) does not support prepared statements.
    prepare: false,
  });
}

/**
 * Privileged Drizzle client (`neondb_owner` / BYPASSRLS).
 *
 * Use for migrations, catalog writes, and trusted server jobs.
 * User-scoped reads/writes must go through `withUserRls` in `./rls`.
 *
 * Lazy so `next build` / typecheck can import this module without DATABASE_URL.
 */
export function getDb(): Database {
  if (!globalForDb.marketplaceDb) {
    globalForDb.marketplaceSql = createSql(requireDatabaseUrl(), 10);
    globalForDb.marketplaceDb = drizzle(globalForDb.marketplaceSql, { schema });
  }
  return globalForDb.marketplaceDb;
}

export function getSql(): PostgresClient {
  getDb();
  return globalForDb.marketplaceSql!;
}

export { createSql, requireDatabaseUrl };
