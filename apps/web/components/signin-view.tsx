'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cloudEnabled, useAppData } from '@/lib/app-data';
import { takeReturnPath } from '@/lib/return-path';
import { friendlyAuthError, googleSignInEnabled, signInRedirectUrl, supabase } from '@/lib/supabase';
import { Notice } from './fields';

/** Set just before leaving for Google, so a failed return can be explained as a Google problem. */
const GOOGLE_PENDING_KEY = 'ha-google-signin-pending';

function readGooglePending(): boolean {
  try {
    const pending = window.sessionStorage.getItem(GOOGLE_PENDING_KEY) === '1';
    window.sessionStorage.removeItem(GOOGLE_PENDING_KEY);
    return pending;
  } catch {
    return false;
  }
}

/**
 * Why a sign-in link (or a return from Google) that brought the user here didn't work, read from the
 * address before the Supabase client tidies it up. A leftover one-time code
 * almost always means the link was opened in a different browser or app
 * from the one that asked for it.
 */
function linkErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const fromGoogle = readGooglePending();
  const described = params.get('error_description') ?? hash.get('error_description');
  if (described) {
    const why = described.replaceAll('+', ' ');
    return fromGoogle ? `Google sign-in didn't finish: ${why}. Please try again.` : `That link didn't work: ${why}. Please try again below.`;
  }
  if (params.has('code')) {
    if (fromGoogle) return "Google sign-in didn't finish. Please try again.";
    return "That link was opened in a different browser from the one that asked for it, so it couldn't sign you in. Try again below, then open the email in this same browser.";
  }
  return null;
}

export function SignInView() {
  const { ready, mode, email, signOut, recoveringPassword, doneRecoveringPassword } = useAppData();
  // Read once, as the page opens (this runs before the app connects to Supabase).
  const [linkError, setLinkError] = useState<string | null>(null);
  useEffect(() => setLinkError(linkErrorFromUrl()), []);
  const [changingPassword, setChangingPassword] = useState(false);
  const router = useRouter();
  // Came here from Google or an emailed link after trying to open a page: go back to it.
  useEffect(() => {
    if (!email || recoveringPassword) return;
    const back = takeReturnPath();
    if (back) router.replace(back);
  }, [email, recoveringPassword, router]);
  const saving = mode === 'cloud' ? 'are saved to your account, so they\'re on every device you sign in on.' : 'are kept in this browser until your account loads. Reload the page to try again.';

  if (!cloudEnabled) {
    return (
      <Card title="Sign-in isn't set up here">
        <p className="text-muted">This copy of the app keeps everything in this browser. Your answers and check-ins are saved on this device only.</p>
      </Card>
    );
  }
  if (!ready) return <div className="mx-auto h-72 max-w-md animate-pulse rounded-2xl bg-surface-2" aria-label="Loading" />;

  if (email && recoveringPassword) {
    return (
      <Card title="Choose a new password">
        <p className="text-muted">
          You're signed in as <span className="font-medium text-text">{email}</span>. Choose a password to use with this email from now on.
        </p>
        <NewPasswordForm onDone={doneRecoveringPassword} onCancel={doneRecoveringPassword} />
      </Card>
    );
  }

  if (email) {
    return (
      <Card title="You're signed in">
        <p className="text-muted">
          Signed in as <span className="font-medium text-text">{email}</span>. Your answers, weigh-ins and check-ins {saving}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/results" className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong">
            My targets
          </Link>
          <button type="button" onClick={() => void signOut()} className="h-12 rounded-xl border border-border bg-surface px-6 font-medium hover:bg-surface-2">
            Sign out
          </button>
        </div>
        <div className="mt-6 border-t border-border pt-5">
          {changingPassword ? (
            <>
              <h2 className="text-lg font-semibold">Set or change your password</h2>
              <p className="mt-1 text-sm text-muted">Then you can sign in with your email and password, without waiting for an email.</p>
              <NewPasswordForm onDone={() => setChangingPassword(false)} onCancel={() => setChangingPassword(false)} />
            </>
          ) : (
            <button type="button" onClick={() => setChangingPassword(true)} className="text-sm font-medium text-brand hover:underline">
              Set or change password
            </button>
          )}
        </div>
      </Card>
    );
  }

  return <SignedOutForm linkError={linkError} />;
}

type Mode = 'signin' | 'signup' | 'forgot' | 'link';

const inputClass = 'h-12 w-full rounded-xl border border-border bg-surface px-4 text-lg outline-none focus:border-brand';
const primaryButton = 'h-12 w-full rounded-xl bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-60';
const linkButton = 'text-sm font-medium text-brand hover:underline';
const MIN_PASSWORD = 8;

/**
 * Sign in, create an account, reset a password or ask for an emailed link.
 * `gated` is set when it stands in for a page that needs an account.
 */
export function SignedOutForm({ linkError, initialMode = 'signin', gated = false }: { linkError: string | null; initialMode?: Mode; gated?: boolean }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<null | 'link' | 'confirm' | 'reset'>(null);
  const [google, setGoogle] = useState(false);
  useEffect(() => {
    let live = true;
    void googleSignInEnabled().then((on) => live && setGoogle(on));
    return () => {
      live = false;
    };
  }, []);

  const switchTo = (m: Mode) => {
    setMode(m);
    setError('');
  };

  if (sent) {
    const what = {
      link: 'a sign-in link',
      confirm: 'a link to confirm your email and finish creating your account',
      reset: 'a link to choose a new password',
    }[sent];
    return (
      <Card title="Check your email">
        <p className="text-muted">
          We sent {what} to <span className="font-medium text-text">{email}</span>. Open it on this device and in this browser; the link works
          once and expires in an hour. If it isn't there in a minute or two, check your spam folder.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(null);
            switchTo('signin');
          }}
          className={`mt-6 ${linkButton}`}
        >
          Back to sign in
        </button>
      </Card>
    );
  }

  const submit = async () => {
    const db = supabase();
    if (!db) return;
    const address = email.trim();
    setError('');
    if (mode === 'signup' && password.length < MIN_PASSWORD) {
      setError(`Please use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await db.auth.signInWithPassword({ email: address, password });
        if (err) throw err;
        // Signed in: the page switches to "You're signed in" by itself.
      } else if (mode === 'signup') {
        const { data, error: err } = await db.auth.signUp({ email: address, password, options: { emailRedirectTo: signInRedirectUrl() } });
        if (err) throw err;
        // Supabase answers an already-used email with an account that has no sign-in methods.
        if (data.user && data.user.identities?.length === 0) throw new Error('already registered');
        if (!data.session) setSent('confirm');
      } else if (mode === 'forgot') {
        const { error: err } = await db.auth.resetPasswordForEmail(address, { redirectTo: signInRedirectUrl() });
        if (err) throw err;
        setSent('reset');
      } else {
        const { error: err } = await db.auth.signInWithOtp({ email: address, options: { emailRedirectTo: signInRedirectUrl(), shouldCreateUser: true } });
        if (err) throw err;
        setSent('link');
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  const withGoogle = async () => {
    const db = supabase();
    if (!db) return;
    setError('');
    setBusy(true);
    try {
      window.sessionStorage.setItem(GOOGLE_PENDING_KEY, '1');
    } catch {
      // Private mode without storage: the sign-in still works, only the error wording is less specific.
    }
    const { error: err } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: signInRedirectUrl() } });
    if (err) {
      setError(friendlyAuthError(err.message));
      setBusy(false);
    }
    // Otherwise the browser is on its way to Google.
  };

  const title = { signin: gated ? 'Sign in to continue' : 'Sign in', signup: gated ? 'Create your free account' : 'Create your account', forgot: 'Reset your password', link: 'Sign in with an email link' }[mode];
  const accountIntro = gated
    ? "Sign up to get your targets, diet plan, workouts and weekly check-ins. It's free, and everything is saved to your account so you can use it on your phone and laptop."
    : null;
  const intro = {
    signin: accountIntro ?? 'Save your answers, weigh-ins and check-ins to your account, and use them on your phone and laptop.',
    signup: accountIntro ?? 'Save your answers, weigh-ins and check-ins to your account, and use them on your phone and laptop.',
    forgot: "Enter your email and we'll send you a link to choose a new password. This also works if you've never set one.",
    link: "No password needed: we'll email you a link that signs you in.",
  }[mode];
  const submitLabel = {
    signin: busy ? 'Signing in…' : 'Sign in',
    signup: busy ? 'Creating account…' : 'Create account',
    forgot: busy ? 'Sending…' : 'Email me a reset link',
    link: busy ? 'Sending…' : 'Email me a sign-in link',
  }[mode];
  const usesPassword = mode === 'signin' || mode === 'signup';

  return (
    <Card title={title}>
      <p className="text-muted">{intro}</p>
      {linkError ? (
        <div className="mt-4">
          <Notice tone="warn">{linkError}</Notice>
        </div>
      ) : null}

      {usesPassword ? (
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Sign in or create an account">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchTo(m)}
              className={`h-10 rounded-lg text-sm font-semibold ${mode === m ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>
      ) : null}

      {usesPassword && google ? (
        <>
          <button
            type="button"
            onClick={() => void withGoogle()}
            disabled={busy}
            className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 font-semibold hover:bg-surface-2 disabled:opacity-60"
          >
            <GoogleMark />
            Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            or use your email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form
        className={`${usesPassword && google ? '' : 'mt-6 '}space-y-4`}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
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
            className={inputClass}
          />
        </div>
        {usesPassword ? (
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            hint={mode === 'signup' ? `At least ${MIN_PASSWORD} characters.` : undefined}
          />
        ) : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <button type="submit" disabled={busy} className={primaryButton}>
          {submitLabel}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
        {mode === 'signin' ? (
          <>
            <button type="button" onClick={() => switchTo('forgot')} className={linkButton}>
              Forgot password?
            </button>
            <button type="button" onClick={() => switchTo('link')} className={linkButton}>
              Email me a sign-in link instead
            </button>
          </>
        ) : mode === 'signup' ? null : (
          <button type="button" onClick={() => switchTo('signin')} className={linkButton}>
            Back to sign in with a password
          </button>
        )}
      </div>

      {gated ? null : (
        <p className="mt-5 text-xs text-muted">
          Anything you've already entered on this device moves into your account the first time you sign in.
        </p>
      )}
      <p className={`${gated ? 'mt-5' : 'mt-2'} text-xs text-muted`}>
        Signed in on your phone already? Each browser signs in on its own, so sign in here too to see the same data on this device.
      </p>
    </Card>
  );
}

function NewPasswordForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <div className="mt-4 space-y-4">
        <Notice tone="info">Password saved. Next time, sign in with your email and this password.</Notice>
        <button type="button" onClick={onDone} className={linkButton}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < MIN_PASSWORD) return setError(`Please use at least ${MIN_PASSWORD} characters.`);
        if (password !== confirm) return setError("The two passwords don't match.");
        const db = supabase();
        if (!db) return;
        setBusy(true);
        const { error: err } = await db.auth.updateUser({ password });
        setBusy(false);
        if (err) setError(friendlyAuthError(err.message));
        else setSaved(true);
      }}
    >
      <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint={`At least ${MIN_PASSWORD} characters.`} />
      <PasswordField id="confirm-password" label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={busy} className="h-12 rounded-xl bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-60">
          {busy ? 'Saving…' : 'Save password'}
        </button>
        <button type="button" onClick={onCancel} className="h-12 rounded-xl border border-border bg-surface px-6 font-medium hover:bg-surface-2">
          Not now
        </button>
      </div>
    </form>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string | undefined;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-base font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-20`}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text"
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Google's "G" mark, as Google's sign-in guidelines ask for on this button. */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
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
