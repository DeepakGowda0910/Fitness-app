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
| `admin_roles` | nothing (only through the admin functions below) | everything |
| anything | not signed in (`anon`): nothing | |

The API must run user requests through `withUser(db, authUserId, fn)`, which
opens a transaction as the `authenticated` role with the caller's id as the
JWT `sub`. The service role bypasses RLS and is used only for engine writes and
account deletion.

`nutrition_targets`, `consents`, `audit_logs` and `checkin_assessments` also
reject UPDATE through a trigger (`0001_append_only.sql`).

## Admin area

`migrations/0006_admin_access.sql` adds the admin powers behind `/admin` in
the web app. The site is static and only has the public key, so there is no
secret key anywhere in the browser: each admin action is a `SECURITY DEFINER`
function that first checks the caller is an active admin (`admin_roles`), then
writes `audit_logs`, then acts.

| Function | Who | What |
| --- | --- | --- |
| `my_admin_role()` | any signed-in user | their own role, or null |
| `admin_list_users()` | admin | email, status, role, joined, last sign-in, onboarding stage, check-in count. No names, measurements or health answers |
| `admin_set_user_status(id, 'suspended' \| 'active')` | admin | suspends (bans sign-in in `auth.users`; RLS also stops data access) or reactivates |
| `admin_delete_user(id, email)` | super admin | erases the account and all data, after the email is typed to confirm. The audit row keeps only the random id |
| `admin_recent_actions(n)` | admin | latest admin actions |
| `grant_admin_role(email, role \| null)` | SQL editor only | make or remove an admin |

Admin accounts (including your own) can't be suspended or deleted from the
app. Users cannot change their own `status` (trigger `users_guard_status`),
and `app_user_id()` returns nothing for suspended users, so every
owner-only policy stops matching.

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

A project that already ran an older `setup.sql` runs the matching update
script instead, once: `supabase/update-1-admin.sql` adds the admin area
(migrations 0005 and 0006). The same script generates both, and a test checks
that the update brings an old project to the same state.
