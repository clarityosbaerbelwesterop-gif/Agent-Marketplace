<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Marketplace

This repository is a rentable AI-agent marketplace: browse agents, rent access, chat with a rented agent, and pay through Stripe. The UI is still route shells. The database layer (Drizzle schema, SQL migrations, RLS) lives in `lib/db/` and `drizzle/`.

Do not treat placeholder pages as a catalog, checkout, or auth implementation. Do not seed a large fake agent catalog. Do not ship a mock Stripe checkout that looks real.

## Stack

- Next.js App Router
- TypeScript (strict)
- Tailwind CSS
- ESLint (`eslint-config-next`)
- pnpm (`packageManager` in `package.json`)
- Drizzle ORM + `postgres` (postgres.js) against Lakebase Postgres on Neon

Integrations:

- Lakebase Postgres via Neon (`DATABASE_URL`) — schema + RLS in this repo
- Neon Auth (Managed Better Auth) — tables already exist in schema `neon_auth`; do **not** recreate them
- Stripe billing — env placeholders only; `rentals.stripe_session_id` / `stripe_payment_intent_id` are nullable columns, not a checkout
- Model routing via `UNOROUTER_API_KEY` — not wired

Use **one** auth system (Neon Auth). Do not introduce a second auth library.

Neon project (docs only): `calm-fog-88681490`, default branch `main` / `br-young-term-b1v4ry1z`.

## Folder conventions

| Path | Purpose |
| --- | --- |
| `app/` | App Router routes, root layout, global styles |
| `components/` | Shared UI. Keep presentational; no data fetching of marketplace inventory yet |
| `lib/` | Shared utilities and server helpers (`lib/db` for Drizzle) |
| `lib/db/` | Drizzle schema, privileged client, RLS session helper |
| `drizzle/` | SQL migrations generated/applied with drizzle-kit |
| `types/` | Shared TypeScript domain types |

Route files live next to the URL they represent:

- `app/page.tsx` → `/`
- `app/marketplace/page.tsx` → `/marketplace`
- `app/agents/[slug]/page.tsx` → `/agents/:slug`
- `app/checkout/page.tsx` → `/checkout`
- `app/chat/page.tsx` → `/chat`
- `app/login/page.tsx` → `/login` (auth placeholder only)

## Database

Public catalog is shared. Private rows are scoped to a Neon Auth user and/or workspace.

### Schema (`public`)

| Table | Purpose | Visibility |
| --- | --- | --- |
| `workspaces` | Named workspace; `owner_user_id` → `neon_auth.user.id` (uuid) | members / owner |
| `workspace_members` | `(workspace_id, user_id, role)` | members; writes: owner |
| `agent_profiles` | Public catalog (slug unique). Visual identity, `model_config`, connectors, permissions, `rental_options` JSONB, tier, rating status | public **read**; writes: service / privileged role |
| `agent_skills` | Versioned skill packages; `agent_profile_id` nullable for shared packs; `published` gate | public **read** where `published`; writes: privileged |
| `favorites` | `(user_id, agent_profile_id)` | owning user |
| `rentals` | Rental window, usage counters, nullable Stripe ids | renter or workspace member |
| `agent_sessions` | Chat/runtime session under a rental | workspace member + visible rental |
| `agent_runs` | Background work during a rental | via session visibility |
| `memories` | User+workspace isolated notes (`kind` + `content`; no embedding column yet) | owning user in that workspace |
| `connector_grants` | Per user+workspace provider scopes | owning user in that workspace |

Auth tables (`neon_auth.user`, `session`, `account`, `organization`, `member`, …) are owned by Neon Auth. Marketplace user columns are `uuid` to match `neon_auth.user.id`. FKs to `neon_auth."user"(id)` are in the SQL migration only so drizzle-kit cannot CREATE/DROP auth tables.

No catalog seed ships with the migration.

### Connections

| Env var | Role | When to use |
| --- | --- | --- |
| `DATABASE_URL` | `neondb_owner` (BYPASSRLS), **pooled** (`-pooler`) | Next.js privileged client (`getDb()`): migrations are *not* this URL’s job at runtime, but catalog writes / admin jobs |
| `DATABASE_URL_UNPOOLED` | `neondb_owner`, **direct** (no `-pooler`) | `pnpm db:migrate` / drizzle-kit (PgBouncer breaks some DDL) |
| `DATABASE_AUTHENTICATED_URL` | optional LOGIN role **without** BYPASSRLS | `withUserRls()`; if unset, RLS helper uses `DATABASE_URL` plus `SET LOCAL ROLE authenticated` |

`neondb_owner` bypasses RLS. Treat `getDb()` as a service-role connection. Never use it for user-scoped marketplace queries.

### Session claims (`auth.user_id()`)

The migration creates schema `auth` and:

```sql
auth.user_id()  -- text; JWT `sub` = neon_auth.user.id
```

It reads, in order:

1. `current_setting('request.jwt.claim.sub', true)` (PostgREST / Data API style)
2. `current_setting('request.jwt.claims', true)::jsonb ->> 'sub'` (Better Auth / Neon Auth JWT)

Policies compare `auth.user_id() = <uuid_column>::text`.

Next.js should resolve the user from Neon Auth (session cookie / JWT verified against the project JWKS), then:

```ts
import { withUserRls } from "@/lib/db";

await withUserRls(user.id, async (db) => {
  return db.select().from(workspaces);
});
```

`withUserRls` opens a transaction, `set_config('request.jwt.claims', '{"sub":"<id>","role":"authenticated"}', true)`, and `SET LOCAL ROLE authenticated`. Pass only a server-verified user id.

Roles `authenticated` and `anonymous` are `NOLOGIN`. The privileged login role is granted both so it can `SET LOCAL ROLE authenticated` or `SET LOCAL ROLE anonymous`. If you later enable the Neon Data API, keep these role names; do not replace `auth.user_id()`.

### RLS rules

Every marketplace table has `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`. Table owner still bypasses only if the role has `BYPASSRLS` (`neondb_owner` does).

| Table | `anonymous` | `authenticated` |
| --- | --- | --- |
| `agent_profiles` | SELECT all; writes denied | same |
| `agent_skills` | SELECT `published = true`; writes denied | same |
| `workspaces` | none | SELECT: owner or member; INSERT: `owner_user_id` = self; UPDATE/DELETE: owner |
| `workspace_members` | none | SELECT: member; writes: workspace owner. An `AFTER INSERT` trigger adds the owner as `owner` (SECURITY DEFINER). |
| `favorites` | none | CRUD where `user_id` = self |
| `rentals` | none | SELECT: renter or workspace member; INSERT: renter + member; DELETE: renter |
| `agent_sessions` / `agent_runs` | none | via `is_rental_visible` / `is_session_visible` |
| `memories` / `connector_grants` | none | `user_id` = self **and** workspace member |

Helper functions `is_workspace_member`, `is_workspace_owner`, `is_rental_visible`, `is_session_visible` are `SECURITY DEFINER` so policies do not recurse through RLS.

Catalog writes (new agents, publishing skills) go through `getDb()` / `neondb_owner`, not `authenticated`.

### Commands

```bash
pnpm db:generate   # drizzle-kit generate
pnpm db:migrate    # drizzle-kit migrate (needs DATABASE_URL_UNPOOLED)
```

Apply `drizzle/*.sql` to Neon in order. Do not insert a 10k agent seed here.

## Coding notes

- Default to Server Components. Add `"use client"` only when browser APIs or React hooks are required.
- In Next.js 16+, `params`, `searchParams`, `cookies()`, and `headers()` are async — `await` them.
- Import with the `@/` alias (repo root).
- Keep environment secrets in `.env.local`. Commit only `.env.example` with empty placeholders.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` must stay green on PRs.
