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
| `/workouts` | Weekly workout plan from `@fitness/workout-planner`, matched to training days, session length, experience, goal and where the user trains (gym, dumbbells at home, no equipment). Day tabs with the next day marked, each exercise's sets, reps, rest, form cues, last time and what to aim for (double progression). "Start this workout" opens a logger with weight/reps per set, a rest timer and an effort rating; an unfinished workout survives a reload. Workout history with remove |
| `/checkin` | Log weigh-ins (with a smoothed trend chart) and a weekly check-in: days followed, adherence, hunger, energy, sleep. The engine decides whether calories change; the new targets flow to `/results` and `/plan`. One check-in per week; protein never changes |

Targets, check-in decisions and the diet plan are always calculated in the browser by `@fitness/calc-engine` and `@fitness/meal-planner`, the same
deterministic code the API uses, so no account or server is needed yet.
Answers, weigh-ins and check-ins are kept in this browser's local storage (check-ins reset if the assessment changes) until Supabase sign-in is
connected; then they will be saved through the API.

## Saving data

Without a Supabase project (no `NEXT_PUBLIC_SUPABASE_*` values at build) the
app keeps everything in this browser's local storage.

With one, `/signin` offers three ways in (Supabase Auth, PKCE): email and
password (with "Create account" and "Forgot password?"), "Continue with
Google", and an emailed one-time sign-in link. The Google button only shows
once the Google provider is switched on in Supabase (read from the public
`/auth/v1/settings`). A password-reset link signs the user in and the page
asks for a new password (`PASSWORD_RECOVERY`); signed-in users can also set or
change a password from the same page, which is how accounts made with a link
or Google add one. Once signed
in, `lib/cloud-backend.ts` reads and writes the user's rows directly through
Supabase's Data API, and row-level security limits every query to that user.
The first sign-in moves anything already entered in the browser into the
account. What is stored:

| Data | Table |
| --- | --- |
| Assessment answers | `assessments`, `assessment_answers` (one row per answer) |
| Weigh-ins | `body_measurements` (type `weight`, `created_at` = when recorded) |
| Weekly check-ins | `weekly_checkins` |
| Workouts | `workout_sessions` (one row per workout, sets as JSON). Needs `packages/db/supabase/update-2-workouts.sql` on projects set up before it |

Targets and check-in decisions are not stored by the browser (those tables
are written only by the server). Instead `replay()` in `lib/checkins.ts`
re-runs every check-in through the engine, each seeing only the weigh-ins
recorded before it was submitted, so every device reaches the same numbers.
Check-ins submitted before the assessment answers last changed targets
(`assessments.completed_at`) no longer adjust them.

## Admin site

The admin dashboard is a separate app, `apps/admin` (see `docs/admin.md`).
The user app has no admin pages or links.

## Publishing

`.github/workflows/pages.yml` builds a static export (`NEXT_OUTPUT=export`)
under `/<repo>/` and publishes it to GitHub Pages on every push to `main`.
The same workflow builds `apps/admin` and publishes it at `<site>/admin/`.
It reads two repository *variables* (public by design): `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY`. Supabase Auth must list the Pages address as the
Site URL and allow `<site>/signin/` as a redirect URL. Google sign-in also
needs a Google OAuth client whose redirect URI is
`https://<project-ref>.supabase.co/auth/v1/callback`, with its client ID and
secret entered under Supabase Auth > Sign In / Providers > Google.

`lib/assessment.ts` holds step validation and the mapping to the engine's
input; it is unit-tested in `test/assessment.test.ts`.

## Run locally

```sh
pnpm install && pnpm build
pnpm --filter @fitness/web dev     # http://localhost:3000
```
