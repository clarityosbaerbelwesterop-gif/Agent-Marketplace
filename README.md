# Agent Marketplace

Greenfield Next.js (App Router) scaffold for a **rentable AI-agent marketplace**. Routes are empty shells so the team can add catalog, Neon Auth, Stripe, and chat without fighting boilerplate.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- ESLint
- pnpm

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

## Environment

Copy `.env.example` to `.env.local`. Expected variables (fill from your own Neon, Stripe, and routing providers — this file does not include values):

- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
- Neon Auth: `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `NEXT_PUBLIC_NEON_AUTH_URL`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `UNOROUTER_API_KEY`

Auth, billing, and model calls are not wired up yet. Do not commit `.env.local`.

## Project layout

```
app/            # routes, layout, globals
components/     # shared UI
lib/            # shared utilities
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
