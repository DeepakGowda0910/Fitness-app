# Web app (`apps/web`)

Next.js 16 (App Router) with Tailwind CSS 4. One responsive app: a single
column with thumb-reach buttons on phones, a step list and wider grids on
laptops. Installable as a PWA (`app/manifest.ts`). Light and dark themes
follow the device setting.

## Screens so far

| Route | What |
| --- | --- |
| `/` | Home, with an example worked out by the real engine at build time |
| `/assessment` | Six steps: about you, activity, goal, health check, food, review. Resumes at the first unanswered step |
| `/results` | Calories, macros, fibre, water, maintenance and resting energy, safety notices, and how each number was worked out |

Targets are calculated in the browser by `@fitness/calc-engine`, the same
deterministic code the API uses, so no account or server is needed yet.
Answers are kept in this browser's local storage until Supabase sign-in is
connected; then they will be saved through the API.

`lib/assessment.ts` holds step validation and the mapping to the engine's
input; it is unit-tested in `test/assessment.test.ts`.

## Run locally

```sh
pnpm install && pnpm build
pnpm --filter @fitness/web dev     # http://localhost:3000
```
