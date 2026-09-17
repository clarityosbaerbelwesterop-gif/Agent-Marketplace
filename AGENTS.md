<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Marketplace

This repository is a rentable AI-agent marketplace: browse agents, rent access with Stripe Checkout, chat with a rented agent, and pay through Stripe. Auth, paginated catalog API, a privileged 10k-row seed, the UNOROUTER adapter, and the agent runtime (sessions/runs/streaming) are in place. Stripe Checkout + signed webhooks activate rentals; keys are env-driven (deploy owns secrets).

Do not ship a mock Stripe checkout that looks real. Do not invent benchmarks, success rates, or user counts on catalog rows. Do not send the full catalog to the browser — always paginate server-side. Do not re-seed the 10k catalog unless the generator itself changed. Do not activate a rental from a client success redirect.

## Stack

- Next.js App Router
- TypeScript (strict)
- Tailwind CSS
- ESLint (`eslint-config-next`)
- pnpm (`packageManager` in `package.json`)
- Drizzle ORM + `postgres` (postgres.js) against Lakebase Postgres on Neon

Integrations:

- Lakebase Postgres via Neon (`DATABASE_URL`) — schema + RLS in this repo
- Neon Auth (Managed Better Auth) via `@neondatabase/auth` — tables already exist in schema `neon_auth`; do **not** recreate them or add a second auth library
- Stripe billing — official `stripe` SDK. Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. `POST /api/rentals` creates `rentals.status=pending` and a Checkout Session (`mode=payment`; catalog durations are one-time hour windows, not subscriptions). `POST /api/webhooks/stripe` verifies the signature and is the only path that sets `active`, `starts_at` / `ends_at`, and Stripe ids. Success URL is `/chat?rentalId=` but must not be trusted. Missing keys → HTTP 503 (no unpaid bypass).
- Model routing via UnoRouter (`UNOROUTER_API_KEY`, optional `UNOROUTER_BASE_URL`). Catalog rows still store **model aliases** (`standard` / `advanced` / `expert` / `elite` / `frontier`). `lib/unorouter/` maps those aliases to documented UnoRouter model IDs. Same-tier fallbacks never silently downgrade a premium alias to a much weaker model. If the key is missing, adapter code still loads; runtime calls fail with HTTP 503 and a clear message.

Use **one** auth system (Neon Auth). Do not introduce a second auth library.

Neon project (docs only): `calm-fog-88681490`, default branch `main` / `br-young-term-b1v4ry1z`.

## Folder conventions

| Path | Purpose |
| --- | --- |
| `app/` | App Router routes, root layout, global styles, API handlers |
| `app/api/auth/[...path]` | Neon Auth proxy (`auth.handler()`) |
| `app/api/agents` | Paginated public catalog |
| `app/api/favorites` | Auth-required favorites |
| `components/` | Shared UI |
| `lib/` | Shared utilities and server helpers |
| `lib/auth/` | Neon Auth server instance, session helpers, server actions |
| `lib/catalog/` | Catalog query parsing, list/detail, favorites |
| `lib/unorouter/` | UnoRouter OpenAI-compatible adapter, alias map, capabilities |
| `lib/unorouter/` | UnoRouter OpenAI-compatible adapter, alias map, capabilities |
| `lib/runtime/` | Sessions, runs, memories, skill loop; connector tools gated on grants |
| `lib/connectors/` | First-party connector registry, grant CRUD, OAuth callbacks, runtime tools |
| `lib/stripe/` | Stripe client, Checkout Session create, signed webhook apply |
| `lib/db/` | Drizzle schema, privileged client, RLS session helper |
| `drizzle/` | SQL migrations generated/applied with drizzle-kit |
| `scripts/` | Privileged seed / ops (not a client path) |
| `types/` | Shared TypeScript domain types |

Route files live next to the URL they represent:

- `app/page.tsx` → `/`
- `app/marketplace/page.tsx` → `/marketplace`
- `app/agents/[slug]/page.tsx` → `/agents/:slug`
- `app/checkout/page.tsx` → `/checkout`
- `app/chat/page.tsx` → `/chat` (active rental session UI)
- `app/connectors/page.tsx` → `/connectors` (tenant connector grants for a rental)
- `app/login/page.tsx` → `/login` (Neon Auth sign-in / sign-up / sign-out)
- `GET /api/agents` → paginated catalog (search, category, tier, sort, page, pageSize ≤ 50)
- `GET /api/agents/[slug]` → agent detail + published skill package
- `GET|POST /api/favorites`, `DELETE /api/favorites/[slug]` → session-required; uses `withUserRls`
- `GET|POST /api/rentals` → list / create pending rental + Stripe Checkout Session (`checkoutUrl`)
- `POST /api/rentals/[id]/checkout` → resume an open Checkout Session for a pending rental
- `POST /api/rentals/[id]/renew` → Checkout Session to extend an already-paid rental
- `POST /api/webhooks/stripe` → signed `checkout.session.completed` / `payment_intent.succeeded` (idempotent)
- `POST /api/chat` → authenticated SSE (or `{ background: true }` queue); persists `agent_runs`; **rejects** non-active / expired rentals
- `GET /api/sessions/[id]`, `GET /api/runs/[id]` → poll durable run status
- `GET|POST /api/memories` → user/workspace memory via `withUserRls`
- `GET /api/connectors` → first-party connector catalog (auth). Optional `rentalId` / `sessionId` / `workspaceId` attaches grants
- `GET|POST|DELETE /api/connectors/grants` → list / request / revoke; RLS via `withUserRls`
- `GET /api/connectors/oauth/[provider]/callback` → GitHub / Slack / Vercel OAuth code exchange

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
| `rentals` | Rental window, usage counters, Stripe session/PI ids | renter or workspace member |
| `rental_payments` | One Checkout/PaymentIntent per purchase or renewal; `applied_at` is the idempotency claim | privileged / webhook (`getDb()`) |
| `stripe_events` | Processed Stripe event ids (PK) | privileged / webhook (`getDb()`) |
| `agent_sessions` | Chat/runtime session under a rental | workspace member + visible rental |
| `agent_runs` | Background work during a rental | via session visibility |
| `memories` | User+workspace isolated notes (`kind` + `content`; no embedding column yet) | owning user in that workspace |
| `connector_grants` | Per user+workspace provider scopes, status, metadata, optional credentials | owning user in that workspace |

Auth tables (`neon_auth.user`, `session`, `account`, `organization`, `member`, …) are owned by Neon Auth. Marketplace user columns are `uuid` to match `neon_auth.user.id`. FKs to `neon_auth."user"(id)` are in the SQL migration only so drizzle-kit cannot CREATE/DROP auth tables.

Catalog rows are **not** created by SQL migrations. Seed them with the privileged script (see Commands).

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

Next.js resolves the user with `getVerifiedSession()` / `getVerifiedUserId()` in `lib/auth/server.ts` (`auth.getSession()` from `@neondatabase/auth/next/server`). That is the only trusted identity. Then:

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
| `rental_payments` / `stripe_events` | none | none (FORCE RLS; webhook uses `getDb()` / `neondb_owner`) |
| `agent_sessions` / `agent_runs` | none | via `is_rental_visible` / `is_session_visible` |
| `memories` / `connector_grants` | none | `user_id` = self **and** workspace member |

Helper functions `is_workspace_member`, `is_workspace_owner`, `is_rental_visible`, `is_session_visible` are `SECURITY DEFINER` so policies do not recurse through RLS.

Catalog writes (new agents, publishing skills, the 10k seed) go through `getDb()` / `neondb_owner`, not `authenticated`. Public catalog **reads** may use `getDb()` because `agent_profiles` is world-readable; still paginate and never return unpublished skills (`published = true` filter). User-scoped tables (favorites, rentals, memories, …) must use `withUserRls` after a server-verified session. Stripe webhook apply (`rental_payments`, `stripe_events`, activating/extending `rentals`) uses `getDb()` because Stripe has no user JWT.

### Commands

```bash
pnpm db:generate      # drizzle-kit generate
pnpm db:migrate       # drizzle-kit migrate (needs DATABASE_URL_UNPOOLED)
pnpm db:seed:agents   # upsert ~10k agent_profiles + published skill packs
```

Apply `drizzle/*.sql` to Neon in order. Then run `pnpm db:seed:agents` against `DATABASE_URL_UNPOOLED`.

## First-party connectors

Canonical ids: `neon`, `github`, `slack`, `vercel`, `supabase`, `render`, `stripe`, `cursor`. Registry: `lib/connectors/registry.ts` (display name, description, scopes, env/secret names, capability tags). These are **tenant grants during a rental**, not Cursor/Grok Bot marketplace plugins. Catalog seed still emits `postgres` on some rows; runtime maps that to `neon` without a re-seed.

| Connector | Auth | Platform env | Tenant secrets |
| --- | --- | --- | --- |
| neon | API key | — | `NEON_API_KEY` |
| github | OAuth or PAT | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `GITHUB_TOKEN` |
| slack | OAuth or bot token | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` | `SLACK_BOT_TOKEN` |
| vercel | OAuth or token | `VERCEL_CLIENT_ID`, `VERCEL_CLIENT_SECRET` | `VERCEL_TOKEN` |
| supabase | API key | — | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| render | API key | — | `RENDER_API_KEY` |
| stripe | API key (tenant; not Checkout) | — | `STRIPE_SECRET_KEY` |
| cursor | API key | — | `CURSOR_API_KEY` |

`GET /connectors?rentalId=` is the UI. Do not re-seed the 10k catalog for connector work.

### Catalog seed (`scripts/seed-agent-profiles.ts`)

- Privileged only. Direct (non-pooler) URI. Batched upserts (250 rows).
- Unique slugs: `{category}-{spec}-{domain}-{tier}` (10,000 combinations).
- Idempotent: `ON CONFLICT (slug) DO UPDATE` for profiles; `(slug, version)` for skills. Re-runs refresh generated fields and **keep existing ids**. They do not delete slugs the generator no longer emits.
- Tiers map to **model aliases** of the same name (`standard` … `frontier`). Higher tiers have higher `rental_options` prices, more tokens, and broader permissions/connectors.
- `rating_status` is `untested` or `baselined` only. No fake benchmarks.
- Skill packages are shared (`agent_profile_id` null), versioned (`1.0.0` … `2.1.0`), referenced from `agent_profiles.skill_package_version`.

## Neon Auth

- Package: `@neondatabase/auth` (`createNeonAuth` from `@neondatabase/auth/next/server`).
- Env: `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (≥ 32 chars), `NEXT_PUBLIC_NEON_AUTH_URL`, `NEON_AUTH_JWKS_URL`.
- API proxy: `app/api/auth/[...path]/route.ts`.
- Login UI: `/login` (email/password + Google). Sign-out is a server action.
- `proxy.ts` protects `/account/*` only; catalog routes stay public. Chat and rental APIs require a server-verified session even though the pages are not in the matcher.
- JWKS is for verifying raw JWTs (Better Auth JWT plugin) if a non-cookie caller appears later. The Next.js app uses the signed session cookie via `getSession()`, not a client-supplied Bearer token.

## UNOROUTER

OpenAI-compatible client in `lib/unorouter/`. Official base URL: `https://api.unorouter.com/v1` ([quickstart](https://unorouter.com/en/docs/platform/quickstart)). Canonical secret: `UNOROUTER_API_KEY` (create at https://unorouter.com/en/token). Optional `UNOROUTER_BASE_URL`.

The adapter supports streaming chat completions, tool calling, timeouts/abort, limited retries, `Retry-After` on 429, and 502/503 failover **within the same alias**. Usage (`prompt_tokens`, `completion_tokens`, `total_tokens`) and estimated `cost_usd` are written to `agent_runs`.

Live catalog: `GET {base}/models` with the key (`listModels()`). This environment had no key, so defaults are a **documented snapshot** (quickstart `gpt-oss-120b:free` plus models.dev UnoRouter IDs, 2026-09-17). Override with `UNOROUTER_MODEL_<ALIAS>` / `UNOROUTER_MODEL_<ALIAS>_FALLBACKS`. Do not invent model names; prefer IDs from `/v1/models`.

Default alias map (same-tier fallbacks only):

| Alias | Primary | Fallbacks |
| --- | --- | --- |
| standard | `gpt-oss-120b:free` | `deepseek-v4-flash:free`, `gemma-4-31b-it:free` |
| advanced | `gemini-3.5-flash` | `gpt-5.5`, `deepseek-v4-flash` |
| expert | `gpt-5.2` | `deepseek-v4-pro`, `glm-5.2` |
| elite | `claude-sonnet-5` | `kimi-k2.6`, `minimax-m2.7` |
| frontier | `gpt-5.4` | `claude-opus-4-8` |

Paid aliases do **not** fall back to `:free` variants. A frontier run will not use a standard model.

## Agent runtime

`lib/runtime/` loads `agent_profiles` + the published skill package, creates/continues `agent_sessions` and `agent_runs` for an **active** rental, injects skill instructions (planning / tool selection / result checking / retry — stronger on higher tiers), and reads/writes `memories` through `withUserRls`.

Work is durable in Postgres (`queued` → `running` → `succeeded`/`failed`). `POST /api/chat` streams SSE while the client is connected and uses Next.js `after()` so the run can finish after the browser closes. `{ "background": true }` queues the run and returns IDs for `GET /api/runs/[id]`.

Connector grants: first-party App MCP set in `lib/connectors/` (`neon`, `github`, `slack`, `vercel`, `supabase`, `render`, `stripe`, `cursor`). Rows live in `connector_grants` (RLS: self + workspace member). API status is `pending` | `active` | `revoked`; Postgres still stores active as `granted`. Credentials JSONB is never returned by APIs. Chat/runtime exposes `{provider}_status` / `{provider}_invoke` **only for active grants**. Tools never invent credentials; missing tokens return structured `not_connected`. `{provider}_invoke` is a stub (`not_implemented`) and does not fabricate resources. `status` tools may ping the provider when a token is stored.

OAuth (authorization code) is implemented for GitHub, Slack, and Vercel when `*_CLIENT_ID` / `*_CLIENT_SECRET` plus a ≥32-char state secret (`CONNECTOR_OAUTH_STATE_SECRET` or `NEON_AUTH_COOKIE_SECRET`) are set. Callbacks: `/api/connectors/oauth/{github|slack|vercel}/callback`. If OAuth env is missing, POST leaves the grant **pending** (no fake success). API-key connectors become active only when the required tenant secrets are posted. `stubGrant` is not supported. The Stripe **connector** is tenant API access for a rented agent, not marketplace Checkout.

Chat and session APIs call `rentalIsActive()` (`status=active` and `ends_at` still in the future). Pending, canceled, refunded, and expired windows return HTTP 409.

## Stripe

Official `stripe` SDK in `lib/stripe/`. Canonical secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Success/cancel URLs use `NEXT_PUBLIC_APP_URL` (fallback `VERCEL_URL`). Deploy owns live keys; empty keys make checkout/webhook routes return 503. There is no unpaid-access bypass.

Webhook endpoint: `POST /api/webhooks/stripe`. Configure that URL in the Stripe Dashboard (events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `payment_intent.succeeded`, plus `checkout.session.expired` / `checkout.session.async_payment_failed` to mark open payments canceled). The handler:

1. Reads the **raw** body and `stripe-signature`
2. `constructEventAsync` with `STRIPE_WEBHOOK_SECRET` (reject unsigned payloads)
3. Inserts `stripe_events.id` (PK). Duplicate deliveries return `{ received: true, duplicate: true }`
4. Claims `rental_payments` with `UPDATE ... WHERE applied_at IS NULL`. A second event type for the same payment (`checkout.session.completed` then `payment_intent.succeeded`) does not extend `ends_at` twice
5. Purchase: `pending` → `active`, set `starts_at`/`ends_at` from purchased `durationHours`, store Stripe ids
6. Renewal: `ends_at = max(ends_at, now) + durationHours`, `usage_included += purchased usage`

`POST /api/rentals` `{ slug, durationId }` inserts `rentals.status=pending` and returns `checkoutUrl`. Hosted Checkout is `mode=payment` because catalog `rental_options.durations` are one-time hour windows (4h / 24h / 7d), not recurring subscriptions. `POST /api/rentals/[id]/renew` starts another Checkout Session for an already-paid rental.

Webhook writes use `getDb()` (privileged). `rental_payments` and `stripe_events` have FORCE RLS and no authenticated policies.

## Coding notes

- Default to Server Components. Add `"use client"` only when browser APIs or React hooks are required.
- In Next.js 16+, `params`, `searchParams`, `cookies()`, and `headers()` are async — `await` them.
- Import with the `@/` alias (repo root).
- Keep environment secrets in `.env.local`. Commit only `.env.example` with empty placeholders.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` must stay green on PRs.
