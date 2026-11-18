# Hosting: a clean free link

The app is published in two places, both free:

| Where | Link | How it updates |
| --- | --- | --- |
| **Cloudflare Pages** (main link) | `https://hyperactive.pages.dev` (admin at `/admin/`) | Cloudflare builds `main` itself on every merge |
| GitHub Pages (old link) | `https://deepakgowda0910.github.io/Fitness-app/` | `.github/workflows/pages.yml` |

Both run `scripts/build-site.sh`, which builds the user app and the admin site into
`apps/web/out` (`SITE_BASE_PATH` is empty for Cloudflare, `/Fitness-app` for GitHub Pages).
Cloudflare also reads the `_headers` file it writes, so the security headers are sent there.

When the repository variable `NEW_SITE_URL` is set, the GitHub Pages workflow stops publishing
the app and publishes forwarding pages instead (`scripts/build-redirect.mjs`): every old link,
including sign-in email links, opens the same page on the new link.

A custom domain bought later is added in Cloudflare (project → **Custom domains**) with no code change;
then repeat Part B below with the new address.

## Setup, click by click (about 15 minutes)

Do this after the pull request that added this file is merged.

### Part A: Cloudflare Pages (makes the new link)

1. Open https://dash.cloudflare.com/sign-up and sign up free (any email). Skip any "add a domain" step.
2. In the left menu click **Compute (Workers)** → **Workers & Pages** (on older screens just **Workers & Pages**).
3. Click **Create application**. Click the **Pages** tab (or the link "Looking to deploy Pages? Get started").
4. Choose **Import an existing Git repository** → **Connect GitHub**.
   GitHub asks to install Cloudflare: pick **Only select repositories** → **Fitness-app** → **Install & Authorize**.
5. Back in Cloudflare, click **Fitness-app** → **Begin setup**.
6. Fill in:
   - Project name: `hyperactive` (this becomes `hyperactive.pages.dev`; if it is taken, try `hyper-active` or `hyperactive-app`)
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: `bash scripts/build-site.sh`
   - Build output directory: `apps/web/out`
7. Open **Environment variables (advanced)** and add these four (click **+ Add variable** for each):

   | Variable name | Value |
   | --- | --- |
   | `NODE_VERSION` | `22` |
   | `SKIP_DEPENDENCY_INSTALL` | `1` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://frvuoerypmhxhixwvmgm.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable key (see below) |

   The publishable key is public (it is already inside the live app), so it is fine here.
   Find it in GitHub: repository **Settings** → **Secrets and variables** → **Actions** → **Variables** tab → `SUPABASE_PUBLISHABLE_KEY`.
   Or in Supabase: **Project Settings** → **API Keys** → the key starting `sb_publishable_`.
8. Click **Save and Deploy**. Wait 3 to 5 minutes until it says **Success**, then click the `*.pages.dev` link.
   Write down the exact link it shows.

### Part B: Supabase (lets sign-in emails and Google come back to the new link)

1. Open https://supabase.com/dashboard → your Hyper Active project.
2. Left menu: **Authentication** → **URL Configuration**.
3. **Site URL**: replace it with your new link, e.g. `https://hyperactive.pages.dev`. Click **Save changes**.
4. Under **Redirect URLs** click **Add URL**, paste `https://hyperactive.pages.dev/**` (your link plus `/**`), click **Save URLs**.
   Leave the old `github.io` entry there.
5. Only if you turned on Google sign-in: open https://console.cloud.google.com → **Google Auth Platform** → **Clients** →
   **Hyper Active web** → under **Authorized JavaScript origins** click **+ Add URI**, paste your new link, click **Save**.

### Check it

1. Open the new link on your phone and laptop and sign in. Your plan and history are there (they live in Supabase).
2. Open `<new link>/admin/` and sign in as admin.
3. On your phone, remove the old home-screen icon and add the app again from the new link.

### Part C (optional): send the old link to the new one

Only do this once Part A and B work.

1. If you ever used the app **without signing in** on the old link, open the old link first and sign in,
   so that data is saved to your account (data from a signed-out visit stays in that browser only).
2. On GitHub open the repository → **Settings** → **Secrets and variables** → **Actions** → **Variables** tab → **New repository variable**.
3. Name: `NEW_SITE_URL`. Value: your new link, e.g. `https://hyperactive.pages.dev` (no `/` at the end). Click **Add variable**.
4. Click the **Actions** tab → **Publish web app** (left list) → **Run workflow** → **Run workflow**.
5. After about a minute, opening the old link jumps to the new one.

To undo, delete the `NEW_SITE_URL` variable and run the workflow again.
