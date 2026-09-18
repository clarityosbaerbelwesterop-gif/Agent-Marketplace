#!/usr/bin/env node
/**
 * Resolve (or create) the Vercel production project using VERCEL_TOKEN.
 * Never prints secret values. Writes .vercel/project.json for the CLI.
 *
 * GitHub Actions secrets VERCEL_ORG_ID / VERCEL_PROJECT_ID are preferred
 * when set; otherwise this looks up or creates `agent-marketplace`.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PROJECT_NAME = process.env.VERCEL_PROJECT_NAME || "agent-marketplace";
const TOKEN = process.env.VERCEL_TOKEN?.trim();
const ENV_EXAMPLE = path.join(process.cwd(), ".env.example");

/** Must stay unset on Vercel production. Neon webpreview is the unpaid host. */
const UNPAID_FLAG = "MARKETPLACE_ALLOW_UNPAID_ACCESS";

/** Runtime names from .env.example that production should set (no values here). */
const PRODUCTION_ENV_NAMES = [
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "DATABASE_AUTHENTICATED_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "NEXT_PUBLIC_NEON_AUTH_URL",
  "NEON_AUTH_JWKS_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "UNOROUTER_API_KEY",
  "UNOROUTER_BASE_URL",
  "FREELLM_API_KEY",
  "FREELLM_BASE_URL",
];

if (!TOKEN) {
  console.error(
    "VERCEL_TOKEN is missing. Add it as a GitHub Actions secret, then re-run.",
  );
  process.exit(1);
}

function appendEnv(file, line) {
  if (process.env[file]) {
    return writeFile(process.env[file], `${line}\n`, { flag: "a" });
  }
  return Promise.resolve();
}

async function api(pathname, init = {}) {
  const url = new URL(pathname, "https://api.vercel.com");
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  if (teamId && !url.searchParams.has("teamId")) {
    url.searchParams.set("teamId", teamId);
  }
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    const message =
      body?.error?.message || body?.message || text || response.statusText;
    const error = new Error(`Vercel API ${response.status} ${pathname}: ${message}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function projectFromList(payload, name) {
  const projects = payload?.projects ?? payload ?? [];
  if (!Array.isArray(projects)) {
    return null;
  }
  return (
    projects.find((project) => project.name === name) ??
    projects.find((project) => project.name?.toLowerCase() === name.toLowerCase()) ??
    null
  );
}

async function resolveTeamId() {
  if (process.env.VERCEL_TEAM_ID?.trim()) {
    return process.env.VERCEL_TEAM_ID.trim();
  }
  const payload = await api("/v2/user");
  const user = payload.user ?? payload;
  const teamId = user.defaultTeamId || user.defaultTeam?.id || "";
  if (teamId) {
    process.env.VERCEL_TEAM_ID = teamId;
  }
  const who = user.username || user.email || user.id || "ok";
  console.log(`Vercel token identity: ${who}`);
  return teamId;
}

async function getProjectByName(name) {
  try {
    return await api(`/v9/projects/${encodeURIComponent(name)}`);
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function createProject(name) {
  return api("/v11/projects", {
    method: "POST",
    body: JSON.stringify({
      name,
      framework: "nextjs",
      buildCommand: "pnpm build",
      installCommand: "pnpm install --frozen-lockfile",
      commandForIgnoringBuildStep: "exit 0",
    }),
  });
}

async function ensureGitDeploysIgnored(projectId) {
  try {
    await api(`/v9/projects/${encodeURIComponent(projectId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        commandForIgnoringBuildStep: "exit 0",
      }),
    });
  } catch (error) {
    console.warn(
      `Could not set ignored Git build step (${error.message}). vercel.json ignoreCommand still skips Git deploys.`,
    );
  }
}

async function listProductionEnvKeys(projectId) {
  const payload = await api(
    `/v9/projects/${encodeURIComponent(projectId)}/env`,
  );
  const envs = payload?.envs ?? payload ?? [];
  if (!Array.isArray(envs)) {
    return [];
  }
  return envs
    .filter((entry) => {
      const targets = entry.target ?? [];
      return Array.isArray(targets) ? targets.includes("production") : true;
    })
    .map((entry) => entry.key)
    .filter(Boolean);
}

function parseExampleKeys(source) {
  const keys = [];
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const match = trimmed.match(/^([A-Z][A-Z0-9_]+)=/);
    if (match) {
      keys.push(match[1]);
    }
  }
  return keys;
}

async function main() {
  await resolveTeamId();

  let orgId = process.env.VERCEL_ORG_ID?.trim() || "";
  let projectId = process.env.VERCEL_PROJECT_ID?.trim() || "";
  let created = false;
  let source = "secrets";

  if (!orgId || !projectId) {
    source = "lookup-or-create";
    let project = await getProjectByName(PROJECT_NAME);
    if (!project) {
      const listed = await api(
        `/v9/projects?search=${encodeURIComponent(PROJECT_NAME)}&limit=20`,
      );
      project = projectFromList(listed, PROJECT_NAME);
    }
    if (!project) {
      console.log(`Creating Vercel project "${PROJECT_NAME}" (no Git integration).`);
      try {
        project = await createProject(PROJECT_NAME);
        created = true;
      } catch (error) {
        if (error.status === 409) {
          project = await getProjectByName(PROJECT_NAME);
        }
        if (!project) {
          throw error;
        }
        console.log(`Project "${PROJECT_NAME}" already existed; reusing it.`);
      }
    } else {
      console.log(`Reusing existing Vercel project "${PROJECT_NAME}".`);
    }
    projectId = project.id || project.projectId;
    orgId = project.accountId || orgId;
    if (!orgId) {
      throw new Error(
        "Vercel project has no accountId. Add VERCEL_ORG_ID as a GitHub Actions secret.",
      );
    }
  } else {
    console.log("Using VERCEL_ORG_ID and VERCEL_PROJECT_ID GitHub Actions secrets.");
  }

  await ensureGitDeploysIgnored(projectId);

  await mkdir(".vercel", { recursive: true });
  const projectJson = { orgId, projectId, projectName: PROJECT_NAME };
  await writeFile(".vercel/project.json", `${JSON.stringify(projectJson, null, 2)}\n`);

  await appendEnv("GITHUB_ENV", `VERCEL_ORG_ID=${orgId}`);
  await appendEnv("GITHUB_ENV", `VERCEL_PROJECT_ID=${projectId}`);
  await appendEnv("GITHUB_OUTPUT", `org_id=${orgId}`);
  await appendEnv("GITHUB_OUTPUT", `project_id=${projectId}`);
  await appendEnv("GITHUB_OUTPUT", `created=${created}`);
  await appendEnv("GITHUB_OUTPUT", `source=${source}`);

  const productionKeys = await listProductionEnvKeys(projectId);
  const unpaidPresent = productionKeys.includes(UNPAID_FLAG);

  let exampleKeys = PRODUCTION_ENV_NAMES;
  try {
    const example = await readFile(ENV_EXAMPLE, "utf8");
    const parsed = parseExampleKeys(example).filter((key) => key !== UNPAID_FLAG);
    if (parsed.length > 0) {
      exampleKeys = parsed;
    }
  } catch {
    // keep the built-in list
  }

  const missing = exampleKeys.filter((key) => !productionKeys.includes(key));

  const summary = [
    "## Vercel production project",
    "",
    `- Name: \`${PROJECT_NAME}\``,
    `- orgId (VERCEL_ORG_ID): \`${orgId}\``,
    `- projectId (VERCEL_PROJECT_ID): \`${projectId}\``,
    `- Created this run: ${created ? "yes" : "no"}`,
    `- Source: ${source}`,
    "",
    "### GitHub Actions secrets",
    "",
    "- `VERCEL_TOKEN`: required (already used for this job).",
    `- \`VERCEL_ORG_ID\`: ${process.env.VERCEL_ORG_ID?.trim() ? "present" : "**add this**"} (\`${orgId}\`)`,
    `- \`VERCEL_PROJECT_ID\`: ${process.env.VERCEL_PROJECT_ID?.trim() ? "present" : "**add this**"} (\`${projectId}\`)`,
    "",
    "These two IDs are not credentials. Adding them as secrets makes `vercel pull` / deploy deterministic.",
    "",
    "### Production env (Vercel project, not GitHub Actions)",
    "",
    `\`${UNPAID_FLAG}\` must stay **unset** on Vercel production. Unpaid test access stays on Neon webpreview.`,
    unpaidPresent
      ? ""
      : `- Checked: \`${UNPAID_FLAG}\` is not set on production.`,
    "",
    missing.length
      ? `Names from \`.env.example\` not yet on Vercel production (do not invent values): \`${missing.join("`, `")}\`.`
      : "All listed `.env.example` names are present on Vercel production (values not printed).",
    "",
    "Preview host remains Neon webpreview; this workflow does not create Vercel preview deploys.",
    "",
  ].join("\n");

  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
  }
  console.log(summary);

  if (unpaidPresent) {
    console.error(
      `${UNPAID_FLAG} is set on Vercel production. Unset it (Preview/Neon only) and re-run.`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
