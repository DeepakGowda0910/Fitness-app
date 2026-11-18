'use client';

import { useState } from 'react';
import { signInRedirectUrl, supabase } from '@/lib/supabase';
import { Card, Notice } from './ui';

/**
 * Admin sign-in. It never creates accounts: only an existing account that the
 * database lists as an admin gets past the next screen.
 */
export function SignIn({ linkError, notAdminEmail }: { linkError?: string | null; notAdminEmail?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  if (state === 'sent') {
    return (
      <Card title="Check your email">
        <p className="text-muted">
          If <span className="font-medium text-text">{email}</span> has an account, we sent it a sign-in link. Open it on this device and in
          this browser; it works once and expires in an hour.
        </p>
        <button type="button" onClick={() => setState('idle')} className="mt-6 text-sm font-medium text-brand hover:underline">
          Use a different email
        </button>
      </Card>
    );
  }

  return (
    <Card title="Admin sign-in">
      <p className="text-muted">For Hyper Active admins only. We email you a sign-in link; there's no password.</p>
      <div className="mt-4 space-y-3">
        {notAdminEmail ? (
          <Notice tone="danger">
            <span className="font-medium">{notAdminEmail}</span> isn't an admin account, so it was signed out of this site. It still works in the
            Hyper Active app.
          </Notice>
        ) : null}
        {linkError ? <Notice tone="danger">{linkError}</Notice> : null}
      </div>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const db = supabase();
          if (!db) return;
          setState('sending');
          const { error: err } = await db.auth.signInWithOtp({
            email: email.trim(),
            options: { emailRedirectTo: signInRedirectUrl(), shouldCreateUser: false },
          });
          // An unknown email gets the same answer as a known one, so this page can't be used to find out who has an account.
          if (err && !/signups? not allowed|user not found/i.test(err.message)) {
            setError(err.message.includes('rate') ? 'Too many emails were sent recently. Please wait a few minutes and try again.' : err.message);
            setState('error');
          } else {
            setState('sent');
          }
        }}
      >
        <div>
          <label htmlFor="email" className="mb-1 block text-base font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-lg outline-none focus:border-brand"
          />
        </div>
        {state === 'error' ? <Notice tone="danger">{error}</Notice> : null}
        <button
          type="submit"
          disabled={state === 'sending'}
          className="h-12 w-full rounded-xl bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </form>
    </Card>
  );
}
