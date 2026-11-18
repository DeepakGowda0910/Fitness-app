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

/**
 * Whether "Sign in with Google" is switched on in this Supabase project, read
 * from its public auth settings. False when it can't be checked, so the button
 * only shows once Google sign-in has been set up.
 */
export async function googleSignInEnabled(): Promise<boolean> {
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}

/** Plain-language versions of the sign-in errors people hit most. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate') || m.includes('too many')) return 'Too many tries in a short time. Please wait a few minutes and try again.';
  if (m.includes('invalid login credentials'))
    return "That email and password don't match. If you've only ever signed in with an emailed link or Google, use \"Forgot password?\" to set a password first.";
  if (m.includes('email not confirmed')) return 'Please confirm your email first: open the link we sent when you created your account.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'That email already has an account. Sign in instead, or use "Forgot password?" to set a password.';
  if (m.includes('should be different')) return 'Your new password must be different from your current one.';
  if (m.includes('password should') || m.includes('weak')) return `Please choose a stronger password. ${message}`;
  if (m.includes('reauthenticat')) return 'For safety, please sign out and back in, then set your password again.';
  if (m.includes('provider is not enabled')) return "Google sign-in isn't switched on yet.";
  return message;
}
