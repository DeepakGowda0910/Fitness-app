'use client';

import Link from 'next/link';
import { cloudEnabled, useAppData } from '@/lib/app-data';

/** Sign-in link, or the signed-in account's initial. Hidden when this build has no Supabase project. */
export function AccountButton() {
  const { ready, mode, email, adminRole } = useAppData();
  if (!cloudEnabled || !ready) return null;
  if (mode === 'cloud' && email) {
    return (
      <>
      {adminRole ? (
        <Link href="/admin" className="hidden rounded-lg px-2 py-2 sm:inline-block font-medium text-brand hover:bg-surface-2 sm:px-3">
          Admin
        </Link>
      ) : null}
      <Link
        href="/signin"
        aria-label={`Account: ${email}`}
        title={email}
        className="ml-1 grid size-8 place-items-center rounded-full bg-brand-soft text-sm font-semibold uppercase text-brand"
      >
        {email.charAt(0)}
      </Link>
      </>
    );
  }
  return (
    <Link href="/signin" className="ml-1 rounded-lg border border-border px-2 py-1.5 font-medium hover:bg-surface-2 sm:px-3">
      Sign in
    </Link>
  );
}

/** Tells the user when a change could not be saved to their account. */
export function SyncNotice() {
  const { syncError } = useAppData();
  if (!syncError) return null;
  return (
    <div role="alert" className="mb-4 rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text">
      {syncError} Your last change is shown here but may not be saved. Check your connection and try again.
    </div>
  );
}
