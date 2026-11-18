# API (`apps/api`)

NestJS service the web app calls. It does no maths of its own: every number
comes from `@fitness/calc-engine` and `@fitness/meal-planner`, and every
request body is checked with zod before it reaches them.

## Sign-in

Users sign in with Supabase Auth in the browser and send the access token as
`Authorization: Bearer <token>`. The API checks the signature (the project's
public keys from `SUPABASE_URL`, or the legacy `SUPABASE_JWT_SECRET`), expiry
and audience `authenticated`. Unsigned (`alg: none`) and wrongly signed tokens
get 401.

Reads and writes of user data run through `withUser()` from `@fitness/db`:
a transaction as the `authenticated` role with the user's id as JWT `sub`, so
Postgres row-level security decides what each user can see, not the API code.

## Endpoints (v1)

| Method | Path | Sign-in | What |
| --- | --- | --- | --- |
| GET | `/v1/health` | no | Status and engine/planner versions |
| GET | `/v1/me` | yes | The user's account, or 404 before it exists |
| PUT | `/v1/me` | yes | Create the account on first sign-in, or update `locale`, `units`, `timezone` |
| POST | `/v1/targets/preview` | yes | BMR, TDEE, calories, macros, safety screening (`targetsInputSchema`) |
| POST | `/v1/meal-plans/preview` | yes | 7-day diet plan for given targets, diet type, allergies, meals per day |
| POST | `/v1/checkins/assess` | yes | Adaptive check-in decision from weigh-ins and weekly answers |

The three `preview`/`assess` endpoints store nothing yet. Saving assessments,
targets, plans and check-ins comes with the web onboarding flow.

Invalid input returns 400 with `issues: [{ path, message }]`. A plan that
cannot be built (no dish fits a meal) returns 400 with a `code`.

## Run locally

```sh
pnpm install && pnpm build
cp apps/api/.env.example apps/api/.env   # fill in from your Supabase project
cd apps/api && node --env-file=.env dist/main.js
```

Tests need no account: they use an in-memory Postgres (PGlite) with the same
migrations and test-only signed tokens.
