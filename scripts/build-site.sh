#!/usr/bin/env bash
# Builds the whole website as plain files in apps/web/out:
#   the user app at /           (or /<SITE_BASE_PATH>/)
#   the admin site at /admin/   (a separate app with its own sign-in)
# Used by Cloudflare Pages (main link) and the GitHub Pages workflow.
#
# Inputs (environment variables):
#   SITE_BASE_PATH                       "" for a site at the top of its domain, "/Fitness-app" for GitHub Pages
#   NEXT_PUBLIC_SUPABASE_URL             public Supabase project URL
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY public key (data is protected by row-level security)
set -euo pipefail
cd "$(dirname "$0")/.."

base="${SITE_BASE_PATH:-}"
export NEXT_OUTPUT=export NEXT_TELEMETRY_DISABLED=1

# Use the pnpm version pinned in package.json, whatever the host has installed.
if command -v pnpm >/dev/null 2>&1 && [ "$(pnpm --version)" = "$(node -p "require('./package.json').packageManager.split('@')[1]")" ]; then
  pnpm=(pnpm)
else
  pnpm=(npx --yes "$(node -p "require('./package.json').packageManager")")
fi

if [ ! -d node_modules ]; then
  "${pnpm[@]}" install --frozen-lockfile
fi

NEXT_PUBLIC_BASE_PATH="$base" "${pnpm[@]}" turbo build --filter=@fitness/web
NEXT_PUBLIC_BASE_PATH="$base/admin" "${pnpm[@]}" turbo build --filter=@fitness/admin

test ! -e apps/web/out/admin
cp -r apps/admin/out apps/web/out/admin

# Security headers for hosts that read a _headers file (Cloudflare Pages). GitHub Pages ignores it.
cat > apps/web/out/_headers <<'HEADERS'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/admin/*
  Referrer-Policy: no-referrer
HEADERS

echo "Site built in apps/web/out (base path: '${base:-/}')"
