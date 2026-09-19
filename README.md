# Agent Marketplace

Greenfield Next.js (App Router) app for a **rentable AI-agent marketplace**. Neon Auth, a paginated catalog API, a privileged ~10k agent seed, UNOROUTER plus optional FreeLLM failover, the agent runtime (sessions, group rooms, runs, streaming chat), and Stripe Checkout + signed webhooks are wired. The UI layer styles that flow.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- ESLint
- pnpm
- Drizzle ORM + postgres.js (Lakebase Postgres on Neon)

## Setup

Requires Node.js 20+ and [pnpm](https://pnpm.io/installation) (this repo pins `packageManager` in `package.json`; Corepack is the easiest way to match it).

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

npm also works if you prefer not to use pnpm:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Keep the lockfile in sync with one package manager. Prefer **pnpm**.

## Hosting

| Target | Host | How it deploys |
| --- | --- | --- |
| **Production** | Vercel | Push to `main` runs `.github/workflows/deploy-vercel.yml` (`VERCEL_TOKEN`). |
| **Preview** | Neon webpreview | Existing URL: `https://br-young-term-b1v4ry1z-webpreview.compute.c-5.eu-central-1.aws.neon.tech/` |

Git-triggered Vercel builds are skipped (`vercel.json` `ignoreCommand`) so pull requests do not get a second preview host. `MARKETPLACE_ALLOW_UNPAID_ACCESS` stays **unset** on Vercel production; unpaid test rentals stay on Neon preview.

### GitHub Actions secrets (deploy)

| Secret | Required | Notes |
| --- | --- | --- |
| `VERCEL_TOKEN` | yes | Vercel CLI token |
| `VERCEL_ORG_ID` | recommended | `team_5KyyWAPW9vLU4EiaKaYZuhaG` |
| `VERCEL_PROJECT_ID` | recommended | `prj_z15RWrRsQxcYNLHugYNtbI5iBqmn` |
| `UNOROUTER_API_KEY` | runtime | Synced onto Vercel **production** env on deploy (not invented) |
| `NEON_API_KEY` | no (platform) | Tenant connector secret; not a Vercel production app env |

The first workflow run created Vercel project `agent-marketplace`. Add `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as GitHub Actions secrets so later deploys skip lookup. These ids are not credentials.

App runtime names live on the **Vercel project** (Production scope). Copy names from `.env.example`. Do not set `MARKETPLACE_ALLOW_UNPAID_ACCESS` there.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) |
| `pnpm test` | Smoke tests (compare slugs, rental end, discovery grantable, alias fallbacks) |
| `pnpm db:generate` | Generate SQL migrations from `lib/db/schema.ts` |
| `pnpm db:migrate` | Apply `drizzle/` migrations (`DATABASE_URL_UNPOOLED`) |
| `pnpm db:seed:agents` | Upsert ~10k `agent_profiles` + published skill packs |

## Environment

Copy `.env.example` to `.env.local`. Expected variables (fill from your own Neon, Stripe, and routing providers — this file does not include values):

- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL` (pooled, privileged `neondb_owner`)
- `DATABASE_URL_UNPOOLED` (direct URI for drizzle-kit)
- `DATABASE_AUTHENTICATED_URL` (optional RLS-scoped LOGIN role)
- Neon Auth: `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `NEXT_PUBLIC_NEON_AUTH_URL`, `NEON_AUTH_JWKS_URL`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (webhook: `POST /api/webhooks/stripe`)
- `UNOROUTER_API_KEY` (optional `UNOROUTER_BASE_URL`, `UNOROUTER_MODEL_*` alias overrides)
- `FREELLM_API_KEY` (optional `FREELLM_BASE_URL`, `FREELLM_MODEL_*` routing-strategy overrides). Secondary OpenAI-compatible `/v1` path for failover / high-volume continuation.
- Connector OAuth (optional): `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`, Slack and Vercel equivalents, `CONNECTOR_OAUTH_STATE_SECRET`
- Optional `GITHUB_DISCOVERY_TOKEN` for `GET /api/connectors/discover` GitHub Search rate limits (catalog-only)

Neon Auth is wired at `/login` and `/api/auth/[...path]`. Stripe Checkout is wired; rentals become `active` only after a signed webhook. Do not commit `.env.local`. See `AGENTS.md` for schema, RLS, auth, seed rules, and the production go-live checklist.

## Project layout

```
app/            # routes, layout, globals, API
app/api/        # auth proxy, catalog, favorites
components/     # shared UI
lib/auth/       # Neon Auth server + actions
lib/catalog/    # paginated catalog queries
lib/fixtures/   # small UI samples (not the 10k seed)
lib/unorouter/  # UnoRouter adapter + alias map
lib/freellm/    # FreeLLM-API OpenAI-compatible failover adapter
lib/llm/        # shared OpenAI-compat client + routing policy
lib/connectors/ # first-party connector registry + grants
lib/runtime/    # sessions, runs, memories, connector tools
lib/stripe/     # Checkout + signed webhooks
lib/db/         # Drizzle schema + clients
drizzle/        # SQL migrations
scripts/        # privileged seed
types/          # domain types
```

See `AGENTS.md` for conventions for coding agents.

## Routes

- `/` — landing
- `/marketplace` — paginated catalog UI (server-side; first-class groups Coding / Marketing / Design / Sales)
- `/agents/[slug]` — agent profile from Postgres
- `/compare` — side-by-side catalog fields (up to 4 slugs; `GET /api/agents/compare`)
- `/checkout` — price review and Stripe Checkout resume (`?rentalId=`). Not a fake card form.
- `/chat` — rental chat (SSE) or multi-rental group session; requires a webhook-activated rental
- `/connectors` — tenant connector grants for an active rental
- `/connectors/discover` — catalog-only MCP registry / GitHub topic search
- `/login` — Neon Auth sign-in / sign-up / sign-out
- `GET /api/agents` — catalog JSON (search, category, group, tier, sort, page, pageSize)
- `POST /api/sessions` — solo `{ rentalId }` or group `{ kind: "group", rentalIds }`
- `GET /api/agents/compare` — side-by-side compare (`slugs=a,b,c`, max 4)
- `GET /api/agents/[slug]` — detail JSON
- `GET|POST /api/favorites`, `DELETE /api/favorites/[slug]` — session required
- `GET|POST /api/rentals` — list / create pending rental + Stripe Checkout Session
- `POST /api/checkout` — same create path; returns `url` / `checkoutUrl` for hosted Checkout
- `POST /api/rentals/[id]/checkout` — resume Checkout
- `POST /api/rentals/[id]/renew` — extend via Checkout
- `POST /api/rentals/[id]/end` — owner ends an active/pending rental
- `POST /api/webhooks/stripe` — signed Stripe events (idempotent)
- `POST /api/chat` — stream or background run
- `GET /api/sessions/[id]`, `GET /api/runs/[id]`
- `GET|POST /api/memories`
- `GET /api/connectors` — first-party connector catalog (optional rental/workspace grants)
- `GET /api/connectors/providers` — public first-wave provider list
- `GET /api/connectors/discover` — catalog-only MCP search (`q=`)
- `GET|POST|DELETE /api/connectors/grants` — list / request / revoke
- `GET /api/connectors/oauth/[provider]/callback` — GitHub / Slack / Vercel OAuth

## Catalog seed

```bash
pnpm db:seed:agents
```

Needs `DATABASE_URL_UNPOOLED`. Upserts by slug (profiles) and `(slug, version)` (skills). Safe to re-run; does not delete leftover slugs.
