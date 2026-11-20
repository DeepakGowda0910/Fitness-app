'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** The admin site lives next to the app at <base>/admin/ (a separate app with its own sign-in). */
export const ADMIN_SITE_PATH = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/admin/`;

/**
 * "Admin dashboard" shortcut on the account page, shown only when the
 * database says this account is an admin. Everyone else sees nothing, and
 * the admin site checks the role again on its own.
 */
export function AdminLink({ email }: { email: string }) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const db = supabase();
    if (!db) return;
    let cancelled = false;
    void db.rpc('my_admin_role').then(({ data, error }) => {
      if (!cancelled) setRole(error ? null : ((data as string | null) ?? null));
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  if (!role) return null;
  return (
    <a
      href={ADMIN_SITE_PATH}
      className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-brand bg-brand-soft px-4 py-3 hover:bg-surface-2"
    >
      <span>
        <span className="block font-semibold text-brand">Admin dashboard</span>
        <span className="block text-sm text-muted">
          You&apos;re {role === 'super_admin' ? 'a super admin' : 'an admin'}. Manage users and see what clients enter.
        </span>
      </span>
      <span aria-hidden className="text-xl text-brand">
        →
      </span>
    </a>
  );
}
