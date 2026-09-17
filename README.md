# Agent Marketplace

Greenfield Next.js (App Router) app for a **rentable AI-agent marketplace**. Routes are still shells. The database layer (Drizzle schema, SQL migrations, RLS) is in `lib/db/` and `drizzle/`.

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

## Environment

Copy `.env.example` to `.env.local`. Expected variables (fill from your own Neon, Stripe, and routing providers — this file does not include values):

- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL` (pooled, privileged `neondb_owner`)
- `DATABASE_URL_UNPOOLED` (direct URI for drizzle-kit)
- `DATABASE_AUTHENTICATED_URL` (optional RLS-scoped LOGIN role)
- Neon Auth: `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `NEXT_PUBLIC_NEON_AUTH_URL`, `NEON_AUTH_JWKS_URL`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `UNOROUTER_API_KEY`

Neon Auth and Stripe checkout are not wired in the UI yet. Do not commit `.env.local`. See `AGENTS.md` for schema and RLS rules.

## Project layout

```
app/            # routes, layout, globals
components/     # shared UI
lib/            # shared utilities
lib/db/         # Drizzle schema + clients
drizzle/        # SQL migrations
types/          # domain types
```

See `AGENTS.md` for conventions for coding agents.

## Placeholder routes

- `/` — home
- `/marketplace` — catalog shell
- `/agents/[slug]` — agent detail shell
- `/checkout` — checkout shell (not a Stripe integration)
- `/chat` — chat shell
- `/login` — auth placeholder (not a second auth system)
