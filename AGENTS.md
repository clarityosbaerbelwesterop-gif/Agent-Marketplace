<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Marketplace

This repository is **greenfield** for a rentable AI-agent marketplace: browse agents, rent access, chat with a rented agent, and pay through Stripe. The current tree is a production-ready Next.js scaffold with route shells only. Do not treat placeholder pages as a catalog, checkout, or auth implementation.

## Stack

- Next.js App Router
- TypeScript (strict)
- Tailwind CSS
- ESLint (`eslint-config-next`)
- pnpm (`packageManager` in `package.json`)

Planned integrations (not implemented in this foundation):

- Lakebase Postgres via Neon (`DATABASE_URL`)
- Neon Auth (Managed Better Auth)
- Stripe billing
- Model routing via `UNOROUTER_API_KEY`

Use **one** auth system (Neon Auth) when it is added. Do not introduce a second auth library. Do not ship a mock Stripe checkout that looks real. Do not seed a large fake agent catalog.

## Folder conventions

| Path | Purpose |
| --- | --- |
| `app/` | App Router routes, root layout, global styles |
| `components/` | Shared UI. Keep presentational; no data fetching of marketplace inventory yet |
| `lib/` | Shared utilities and future server helpers (db, auth, stripe) |
| `types/` | Shared TypeScript domain types |

Route files live next to the URL they represent:

- `app/page.tsx` → `/`
- `app/marketplace/page.tsx` → `/marketplace`
- `app/agents/[slug]/page.tsx` → `/agents/:slug`
- `app/checkout/page.tsx` → `/checkout`
- `app/chat/page.tsx` → `/chat`
- `app/login/page.tsx` → `/login` (auth placeholder only)

## Coding notes

- Default to Server Components. Add `"use client"` only when browser APIs or React hooks are required.
- In Next.js 16+, `params`, `searchParams`, `cookies()`, and `headers()` are async — `await` them.
- Import with the `@/` alias (repo root).
- Keep environment secrets in `.env.local`. Commit only `.env.example` with empty placeholders.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` must stay green on PRs.
