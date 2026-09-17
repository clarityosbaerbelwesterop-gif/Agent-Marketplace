# Agent Marketplace

Greenfield Next.js (App Router) app for a **rentable AI-agent marketplace**. Neon Auth, a paginated catalog API, a privileged ~10k agent seed, the UNOROUTER adapter, the agent runtime (sessions, runs, streaming chat), and Stripe Checkout + signed webhooks are wired.

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

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) |
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
- Connector OAuth (optional): `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`, Slack and Vercel equivalents, `CONNECTOR_OAUTH_STATE_SECRET`

Neon Auth is wired at `/login` and `/api/auth/[...path]`. Stripe Checkout is wired; rentals become `active` only after a signed webhook. Do not commit `.env.local`. See `AGENTS.md` for schema, RLS, auth, and seed rules.

## Project layout

```
app/            # routes, layout, globals, API
app/api/        # auth proxy, catalog, favorites
components/     # shared UI
lib/auth/       # Neon Auth server + actions
lib/catalog/    # paginated catalog queries
lib/unorouter/  # UnoRouter adapter + alias map
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

- `/` — home
- `/marketplace` — paginated catalog (server-side; never dumps the full list)
- `/agents/[slug]` — agent detail from Postgres
- `/checkout` → Stripe Checkout resume for a pending rental (`?rentalId=`). Not a fake card form.
- `/chat` — rental chat (SSE); requires a webhook-activated rental
- `/connectors` — tenant connector grants for an active rental
- `/login` — Neon Auth sign-in / sign-up / sign-out
- `GET /api/agents` — catalog JSON (search, category, tier, sort, page, pageSize)
- `GET /api/agents/[slug]` — detail JSON
- `GET|POST /api/favorites`, `DELETE /api/favorites/[slug]` — session required
- `GET|POST /api/rentals` — list / create pending rental + Stripe Checkout Session
- `POST /api/checkout` — same create path; returns `url` / `checkoutUrl` for hosted Checkout
- `POST /api/rentals/[id]/checkout` — resume Checkout
- `POST /api/rentals/[id]/renew` — extend via Checkout
- `POST /api/webhooks/stripe` — signed Stripe events (idempotent)
- `POST /api/chat` — stream or background run
- `GET /api/sessions/[id]`, `GET /api/runs/[id]`
- `GET|POST /api/memories`
- `GET /api/connectors` — first-party connector catalog (optional rental/workspace grants)
- `GET /api/connectors/providers` — public first-wave provider list
- `GET|POST|DELETE /api/connectors/grants` — list / request / revoke
- `GET /api/connectors/oauth/[provider]/callback` — GitHub / Slack / Vercel OAuth

## Catalog seed

```bash
pnpm db:seed:agents
```

Needs `DATABASE_URL_UNPOOLED`. Upserts by slug (profiles) and `(slug, version)` (skills). Safe to re-run; does not delete leftover slugs.
