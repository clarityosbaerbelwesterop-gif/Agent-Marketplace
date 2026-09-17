/**
 * Privileged catalog seed: ~10,000 agent_profiles + shared published skill packs.
 *
 * Usage:
 *   pnpm db:seed:agents
 *
 * Requires DATABASE_URL_UNPOOLED (direct Neon URI, neondb_owner / BYPASSRLS).
 * Falls back to DATABASE_URL if the unpooled var is unset.
 *
 * Idempotency:
 *   - Skills upsert on (slug, version)
 *   - Agent profiles upsert on slug
 *   - Re-running refreshes generated rows in place; it does not delete slugs
 *     that the generator no longer emits. Existing favorites stay attached
 *     because profile ids are left unchanged on conflict.
 *
 * This script is not a client path. Do not call it from the browser.
 */
import { config as loadEnv } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { agentProfiles, agentSkills } from "../lib/db/schema";
import {
  AGENT_TIERS,
  CATALOG_TARGET,
  CATEGORY_DEFS,
  agentDescriptionFor,
  agentNameFor,
  agentSlugFor,
  agentTaglineFor,
  assertCatalogShape,
  comboAt,
  connectorsFor,
  languagesFor,
  permissionsFor,
  ratingStatusFor,
  skillInstructions,
  skillPackageRef,
  skillSlug,
  TIER_CONFIG,
  type CatalogCombo,
} from "./agent-catalog-spec";
import { familyFromCategory } from "../lib/catalog/family";

loadEnv({ path: ".env.local" });
loadEnv();

const BATCH_SIZE = 250;

function requireUnpooledUrl(): string {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL_UNPOOLED is not set (DATABASE_URL fallback also empty).",
    );
  }
  return url;
}

function profileRow(combo: CatalogCombo) {
  const slug = agentSlugFor(combo);
  return {
    slug,
    name: agentNameFor(combo),
    description: agentDescriptionFor(combo),
    category: combo.category.id,
    family: familyFromCategory(combo.category.id),
    specializations: [combo.spec.id, combo.domain.id],
    languages: languagesFor(combo),
    tier: combo.tier.id,
    avatarUrl: null,
    accentColor: combo.category.accent,
    bannerUrl: null,
    tagline: agentTaglineFor(combo),
    modelAlias: combo.tier.id,
    modelConfig: {
      temperature: combo.tier.temperature,
      maxOutputTokens: combo.tier.maxOutputTokens,
      topP: combo.tier.topP,
    },
    skillPackageVersion: skillPackageRef(
      combo.category.id,
      combo.spec.id,
      combo.tier.id,
    ),
    connectors: connectorsFor(combo),
    permissions: permissionsFor(combo),
    rentalOptions: combo.tier.rental,
    availability: combo.tier.availability,
    configVersion: 1,
    ratingStatus: ratingStatusFor(combo.index),
    updatedAt: new Date(),
  };
}

function skillRows() {
  const rows = [];
  for (const category of CATEGORY_DEFS) {
    for (const spec of category.specializations) {
      const slug = skillSlug(category.id, spec.id);
      for (const tier of AGENT_TIERS) {
        const version = TIER_CONFIG[tier].skillVersion;
        rows.push({
          slug,
          version,
          agentProfileId: null,
          instructions: skillInstructions(category, spec, version),
          inputs: {
            type: "object",
            properties: {
              task: { type: "string" },
              domain: { type: "string" },
            },
            required: ["task"],
          },
          outputs: {
            type: "object",
            properties: {
              artifact: { type: "string" },
              assumptions: { type: "array", items: { type: "string" } },
            },
          },
          toolRequirements: {
            tools: TIER_CONFIG[tier].tools,
            connectors: category.connectors,
          },
          checkCriteria: {
            checks: [
              {
                id: "on-scope",
                description: `Stays on ${spec.name.toLowerCase()} work and names assumptions.`,
              },
              {
                id: "no-fake-metrics",
                description: "Does not invent benchmarks, success rates, or user counts.",
              },
              {
                id: "domain-constraint",
                description: "Applies the supplied domain constraint instead of generic copy.",
              },
            ],
          },
          published: true,
        });
      }
    }
  }
  return rows;
}

async function insertBatches<T>(
  label: string,
  rows: T[],
  write: (batch: T[]) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await write(batch);
    const done = Math.min(i + batch.length, rows.length);
    if (done % 1000 === 0 || done === rows.length) {
      console.log(`${label}: ${done}/${rows.length}`);
    }
  }
}

async function main() {
  assertCatalogShape();
  const url = requireUnpooledUrl();
  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  try {
    const skills = skillRows();
    console.log(`Seeding ${skills.length} published skill packages…`);
    await insertBatches("skills", skills, async (batch) => {
      await db
        .insert(agentSkills)
        .values(batch)
        .onConflictDoUpdate({
          target: [agentSkills.slug, agentSkills.version],
          set: {
            instructions: sql`excluded.instructions`,
            inputs: sql`excluded.inputs`,
            outputs: sql`excluded.outputs`,
            toolRequirements: sql`excluded.tool_requirements`,
            checkCriteria: sql`excluded.check_criteria`,
            published: sql`excluded.published`,
          },
        });
    });

    const profiles = Array.from({ length: CATALOG_TARGET }, (_, index) =>
      profileRow(comboAt(index)),
    );
    const slugs = new Set(profiles.map((row) => row.slug));
    if (slugs.size !== profiles.length) {
      throw new Error(
        `Slug collision: ${profiles.length} rows, ${slugs.size} unique slugs`,
      );
    }

    console.log(`Seeding ${profiles.length} agent_profiles (upsert by slug)…`);
    await insertBatches("profiles", profiles, async (batch) => {
      await db
        .insert(agentProfiles)
        .values(batch)
        .onConflictDoUpdate({
          target: agentProfiles.slug,
          set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            category: sql`excluded.category`,
            family: sql`excluded.family`,
            specializations: sql`excluded.specializations`,
            languages: sql`excluded.languages`,
            tier: sql`excluded.tier`,
            accentColor: sql`excluded.accent_color`,
            tagline: sql`excluded.tagline`,
            modelAlias: sql`excluded.model_alias`,
            modelConfig: sql`excluded.model_config`,
            skillPackageVersion: sql`excluded.skill_package_version`,
            connectors: sql`excluded.connectors`,
            permissions: sql`excluded.permissions`,
            rentalOptions: sql`excluded.rental_options`,
            availability: sql`excluded.availability`,
            configVersion: sql`excluded.config_version`,
            ratingStatus: sql`excluded.rating_status`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    });

    const [{ count: profileCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentProfiles);
    const [{ count: skillCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentSkills);

    console.log(
      `Done. agent_profiles=${profileCount} agent_skills=${skillCount}`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
