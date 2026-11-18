# Database

Postgres on Supabase (free tier, Mumbai region `ap-south-1`). The schema
lives in `packages/db` (Drizzle ORM) and is plain SQL migrations, so it runs on
any Postgres 15+.

## Who can touch what

Row-level security (`migrations/0002_row_level_security.sql`) is the second
wall behind the API's own checks.

| Tables | Signed-in user | Engine / server (service role) |
| --- | --- | --- |
| `users` | read, create and update their own row | everything |
| `user_profiles`, `assessments`, `assessment_answers`, `dietary_preferences`, `goals`, `body_measurements`, `weekly_checkins` | full access to their own rows | everything |
| `health_screenings`, `nutrition_targets`, `checkin_assessments` | read their own | writes (numbers only ever come from the calc engine) |
| `consents` | read and add their own | everything |
| `audit_logs` | read entries about themselves | writes |
| `food_sources`, `foods`, `food_nutrients`, `food_portions` | read all (shared reference data) | imports and corrections |
| anything | not signed in (`anon`): nothing | |

The API must run user requests through `withUser(db, authUserId, fn)`, which
opens a transaction as the `authenticated` role with the caller's id as the
JWT `sub`. The service role bypasses RLS and is used only for engine writes and
account deletion.

`nutrition_targets`, `consents`, `audit_logs` and `checkin_assessments` also
reject UPDATE through a trigger (`0001_append_only.sql`).

## Testing

Tests run the real migrations on PGlite (in-memory Postgres) with a small
stand-in for Supabase's `auth.uid()` and roles (`test/helpers.ts`). No account
or credentials are needed.

## Food data

`seedIfct2017(db, ifct2017())` imports the 542 IFCT 2017 foods from
`@fitness/food-data` with 11 nutrients each (per 100 g). It is idempotent, so
it can be re-run after a data correction. Run it with the service role.

## Applying to Supabase

`packages/db/supabase/setup.sql` contains every migration in order plus
Drizzle's bookkeeping rows, in one transaction, for the Supabase SQL editor.
Regenerate it after adding a migration with
`node packages/db/scripts/supabase-setup-sql.mjs` (a test fails if it is out
of date). It also grants table access to signed-in users (`authenticated`)
and removes it from signed-out visitors (`anon`); row-level security then
limits each user to their own rows.
