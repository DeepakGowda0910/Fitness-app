'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public values, built into the page. Data is protected by row-level security, not by hiding these.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when this build is connected to a Supabase project; otherwise the app keeps data in the browser only. */
export const cloudEnabled = Boolean(url && key);

let client: SupabaseClient | null | undefined;

export function supabase(): SupabaseClient | null {
  if (client === undefined) {
    client =
      url && key
        ? createClient(url, key, {
            auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
          })
        : null;
  }
  return client;
}

/** Where sign-in links return to: this site's sign-in page, under any base path. */
export function signInRedirectUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${window.location.origin}${base}/signin/`;
}
