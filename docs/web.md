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
| `/plan` | 7-day Indian diet plan sized to the targets: day tabs, meals with raw-ingredient grams and household units, day totals against targets, "Swap this dish" and "Shuffle dishes" |
| `/admin` | For admins only: user list with search and status filter, sign-up progress, suspend, reactivate, delete (super admin), and recent admin activity. Cards on phones, a table on laptops. See `docs/database.md`, "Admin area" |
| `/checkin` | Log weigh-ins (with a smoothed trend chart) and a weekly check-in: days followed, adherence, hunger, energy, sleep. The engine decides whether calories change; the new targets flow to `/results` and `/plan`. One check-in per week; protein never changes |

Targets, check-in decisions and the diet plan are always calculated in the browser by `@fitness/calc-engine` and `@fitness/meal-planner`, the same
deterministic code the API uses, so no account or server is needed yet.
Answers, weigh-ins and check-ins are kept in this browser's local storage (check-ins reset if the assessment changes) until Supabase sign-in is
connected; then they will be saved through the API.

## Saving data

Without a Supabase project (no `NEXT_PUBLIC_SUPABASE_*` values at build) the
app keeps everything in this browser's local storage.

With one, `/signin` emails a sign-in link (Supabase Auth, PKCE). Once signed
in, `lib/cloud-backend.ts` reads and writes the user's rows directly through
Supabase's Data API, and row-level security limits every query to that user.
The first sign-in moves anything already entered in the browser into the
account. What is stored:

| Data | Table |
| --- | --- |
| Assessment answers | `assessments`, `assessment_answers` (one row per answer) |
| Weigh-ins | `body_measurements` (type `weight`, `created_at` = when recorded) |
| Weekly check-ins | `weekly_checkins` |

Targets and check-in decisions are not stored by the browser (those tables
are written only by the server). Instead `replay()` in `lib/checkins.ts`
re-runs every check-in through the engine, each seeing only the weigh-ins
recorded before it was submitted, so every device reaches the same numbers.
Check-ins submitted before the assessment answers last changed targets
(`assessments.completed_at`) no longer adjust them.

## Publishing

`.github/workflows/pages.yml` builds a static export (`NEXT_OUTPUT=export`)
under `/<repo>/` and publishes it to GitHub Pages on every push to `main`.
It reads two repository *variables* (public by design): `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY`. Supabase Auth must list the Pages address as the
Site URL and allow `<site>/signin/` as a redirect URL.

`lib/assessment.ts` holds step validation and the mapping to the engine's
input; it is unit-tested in `test/assessment.test.ts`.

## Run locally

```sh
pnpm install && pnpm build
pnpm --filter @fitness/web dev     # http://localhost:3000
```
