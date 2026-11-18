# Fitness App

AI-assisted fitness, nutrition and body transformation platform. India-first,
installable web app (PWA) in Phase 1.

## Layout

pnpm + Turborepo monorepo.

| Path | What |
| --- | --- |
| `packages/calc-engine` | Deterministic BMR/TDEE/macro engine, safety screening, goal feasibility. See [docs/calc-engine.md](docs/calc-engine.md). |
| `apps/web` | Next.js PWA (coming next) |
| `apps/api` | NestJS API (coming next) |

## Develop

Requires Node 22+ and pnpm 10 (`corepack enable`).

```sh
pnpm install
pnpm test        # all tests
pnpm typecheck
```
