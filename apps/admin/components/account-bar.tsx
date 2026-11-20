'use client';

import { useSession } from '@/lib/session';

/** The user app sits one level up from this site (<base>/admin/ → <base>/). */
const APP_PATH = `${(process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/admin$/, '')}/`;

export function AccountBar() {
  const { state, signOut } = useSession();
  if (state.kind !== 'admin') return null;
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="hidden truncate text-muted sm:inline" title={state.email}>
        {state.email}
      </span>
      <a href={APP_PATH} className="shrink-0 rounded-lg px-2 py-1.5 font-medium text-brand hover:bg-surface-2">
        Open app
      </a>
      <button type="button" onClick={() => void signOut()} className="shrink-0 rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-surface-2">
        Sign out
      </button>
    </div>
  );
}
