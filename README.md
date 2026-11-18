# Fitness App

AI-assisted fitness, nutrition and body transformation platform. India-first,
installable web app (PWA) in Phase 1.

## Layout

pnpm + Turborepo monorepo.

| Path | What |
| --- | --- |
| `packages/calc-engine` | Deterministic BMR/TDEE/macro engine, safety screening, goal feasibility. See [docs/calc-engine.md](docs/calc-engine.md). |
| `packages/db` | PostgreSQL schema and migrations (Drizzle) for Phase 1. Row-level security for Supabase. See [docs/database.md](docs/database.md). Tests run on an in-memory Postgres, no account needed. |
| `packages/food-data` | Indian Food Composition Tables 2017 (542 foods) as typed JSON, with search by English and Indian names. See [data/NOTICE.md](packages/food-data/data/NOTICE.md) for licence status. |
| `apps/web` | Next.js PWA (coming next) |
| `apps/api` | NestJS API (coming next) |

## Develop

Requires Node 22+ and pnpm 10 (`corepack enable`).

```sh
pnpm install
pnpm test        # all tests
pnpm typecheck
```
