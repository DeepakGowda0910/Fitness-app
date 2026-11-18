'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public values, built into the page. Admin powers are checked by the database on every call, not by hiding these.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const cloudEnabled = Boolean(url && key);

let client: SupabaseClient | null | undefined;

export function supabase(): SupabaseClient | null {
  if (client === undefined) {
    client =
      url && key
        ? createClient(url, key, {
            auth: {
              flowType: 'pkce',
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              // Its own sign-in: being signed in to the user app does not sign you in here, and signing out here doesn't sign you out there.
              storageKey: 'hyper-active-admin-auth',
            },
          })
        : null;
  }
  return client;
}

/** Where admin sign-in links return to: this site's home, under any base path. */
export function signInRedirectUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${window.location.origin}${base}/`;
}
