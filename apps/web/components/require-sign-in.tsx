'use client';

import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { cloudEnabled, useAppData } from '@/lib/app-data';
import { rememberReturnPath, takeReturnPath } from '@/lib/return-path';
import { SignedOutForm } from './signin-view';

/**
 * Shows its page only to signed-in users. Everyone else gets the
 * "create your account" form in its place, and comes back to this page once
 * they're in. Builds without a Supabase project (local development) skip it.
 */
export function RequireSignIn({ children }: { children: ReactNode }) {
  const { ready, email } = useAppData();
  const pathname = usePathname();
  const signedOut = cloudEnabled && ready && !email;

  // Google and emailed links come back to the sign-in page; it sends people on to here.
  useEffect(() => {
    if (signedOut) rememberReturnPath(pathname);
    // Signed in right here with a password: nothing to send them back to later.
    else if (email) takeReturnPath();
  }, [signedOut, email, pathname]);

  if (!cloudEnabled) return <>{children}</>;
  if (!ready) return <div className="mx-auto h-72 max-w-md animate-pulse rounded-2xl bg-surface-2" aria-label="Loading" />;
  if (!email) return <SignedOutForm linkError={null} initialMode="signup" gated />;
  return <>{children}</>;
}
