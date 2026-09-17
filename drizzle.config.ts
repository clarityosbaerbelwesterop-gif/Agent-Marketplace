import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });
loadEnv();

const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  schemaFilter: ["public"],
  dbCredentials: {
    // Direct (non-pooler) URL is required for `drizzle-kit migrate`.
    // `generate` does not connect; an empty string is fine for that command.
    url: migrationUrl,
  },
});
