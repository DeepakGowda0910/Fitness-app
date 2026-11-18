'use client';

import { useSession } from '@/lib/session';

export function AccountBar() {
  const { state, signOut } = useSession();
  if (state.kind !== 'admin') return null;
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="hidden truncate text-muted sm:inline" title={state.email}>
        {state.email}
      </span>
      <button type="button" onClick={() => void signOut()} className="shrink-0 rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-surface-2">
        Sign out
      </button>
    </div>
  );
}
