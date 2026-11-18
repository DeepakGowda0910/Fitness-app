'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cloudEnabled, useAppData } from '@/lib/app-data';
import { signInRedirectUrl, supabase } from '@/lib/supabase';
import { Notice } from './fields';

/**
 * Why a sign-in link that brought the user here didn't work, read from the
 * address before the Supabase client tidies it up. A leftover one-time code
 * almost always means the link was opened in a different browser or app
 * from the one that asked for it.
 */
function linkErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const described = params.get('error_description') ?? hash.get('error_description');
  if (described) return `That sign-in link didn't work: ${described.replaceAll('+', ' ')}. Ask for a new one below.`;
  if (params.has('code')) {
    return "That sign-in link was opened in a different browser from the one that asked for it, so it couldn't sign you in. Ask for a new link below, then open the email in this same browser.";
  }
  return null;
}

export function SignInView() {
  const { ready, mode, email, signOut } = useAppData();
  // Read once, as the page opens (this runs before the app connects to Supabase).
  const [linkError, setLinkError] = useState<string | null>(null);
  useEffect(() => setLinkError(linkErrorFromUrl()), []);

  if (!cloudEnabled) {
    return (
      <Card title="Sign-in isn't set up here">
        <p className="text-muted">This copy of the app keeps everything in this browser. Your answers and check-ins are saved on this device only.</p>
      </Card>
    );
  }
  if (!ready) return <div className="mx-auto h-72 max-w-md animate-pulse rounded-2xl bg-surface-2" aria-label="Loading" />;

  if (mode === 'cloud' && email) {
    return (
      <Card title="You're signed in">
        <p className="text-muted">
          Signed in as <span className="font-medium text-text">{email}</span>. Your answers, weigh-ins and check-ins are saved to your
          account, so they're on every device you sign in on.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/results" className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong">
            My targets
          </Link>
          <button type="button" onClick={() => void signOut()} className="h-12 rounded-xl border border-border bg-surface px-6 font-medium hover:bg-surface-2">
            Sign out
          </button>
        </div>
      </Card>
    );
  }

  return <EmailForm linkError={linkError} />;
}

function EmailForm({ linkError }: { linkError: string | null }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  if (state === 'sent') {
    return (
      <Card title="Check your email">
        <p className="text-muted">
          We sent a sign-in link to <span className="font-medium text-text">{email}</span>. Open it on this device and in this browser; the
          link works once and expires in an hour.
        </p>
        <button type="button" onClick={() => setState('idle')} className="mt-6 text-sm font-medium text-brand hover:underline">
          Use a different email
        </button>
      </Card>
    );
  }

  return (
    <Card title="Sign in">
      <p className="text-muted">
        Save your answers, weigh-ins and check-ins to your account, and use them on your phone and laptop. No password: we email you a link.
      </p>
      {linkError ? (
        <div className="mt-4">
          <Notice tone="warn">{linkError}</Notice>
        </div>
      ) : null}
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const db = supabase();
          if (!db) return;
          setState('sending');
          const { error: err } = await db.auth.signInWithOtp({
            email: email.trim(),
            options: { emailRedirectTo: signInRedirectUrl(), shouldCreateUser: true },
          });
          if (err) {
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
      <p className="mt-4 text-xs text-muted">
        Anything you've already entered on this device moves into your account the first time you sign in.
      </p>
      <p className="mt-2 text-xs text-muted">
        Signed in on your phone already? Each browser signs in on its own, so sign in here too to see the same data on this device.
      </p>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-2">{children}</div>
    </section>
  );
}
