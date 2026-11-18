# Admin site (`apps/admin`)

A separate Next.js app for admins, published by the same GitHub Pages
workflow at `<site>/admin/` (for this repo,
`https://deepakgowda0910.github.io/Fitness-app/admin/`, or `/admin/` on the Cloudflare link: see [hosting.md](hosting.md)). The user app has no
link to it.

- **Its own sign-in.** Email link, like the app, but it never creates
  accounts (`shouldCreateUser: false`) and keeps its session under its own
  storage key, so being signed in to the app doesn't sign you in here and
  signing out here doesn't sign you out there.
- **Admins only.** After sign-in it asks the database for `my_admin_role()`.
  Anyone without a role is signed out of the admin site straight away
  (their app sign-in is untouched).
- **The database decides.** Every list or action is a `SECURITY DEFINER`
  function that checks the role again and writes `audit_logs`
  (`packages/db/migrations/0006_admin_access.sql`, `docs/database.md`). There
  is no secret key in the site; it uses the same public key as the app.
- **What admins see:** email, status, role, joined, last sign-in, onboarding
  stage, check-in count. No names, weights, health answers or check-in
  details.

## Managing a user

Every row has a **Manage** button (or click the row on a laptop). It opens
the account's details and every action the signed-in admin may take, and
says why when something isn't allowed:

| | Admin | Super admin |
| --- | --- | --- |
| Suspend / reactivate a user | yes | yes |
| Make a user an admin, remove admin | no | yes |
| Delete a user | no | yes |
| Your own account, other super admins | no (SQL editor only) | no (SQL editor only) |

## One-time setup

1. Run `packages/db/supabase/update-1-admin.sql` in the Supabase SQL editor
   (once), then `select public.grant_admin_role('<email>', 'super_admin');`.
   Projects set up before roles could be managed here also run
   `update-3-admin-roles.sql` once.
2. Supabase → Authentication → URL Configuration → Redirect URLs: add
   `<site>/admin/`. Without it, admin sign-in links land on the app instead.

## Run locally

```sh
pnpm --filter @fitness/admin dev   # http://localhost:3001
```

Needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
