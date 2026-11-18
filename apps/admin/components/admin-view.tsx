'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteUser,
  describeAction,
  filterUsers,
  listUsers,
  ONBOARDING_LABEL,
  recentActions,
  setUserStatus,
  type AdminAction,
  type AdminRole,
  type AdminUser,
  type UserStatus,
} from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { Notice } from './ui';

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const shortFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
/** "9 Nov" this year, "9 Nov 2025" otherwise. */
const day = (iso: string | null) => {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return (d.getFullYear() === new Date().getFullYear() ? shortFmt : dateFmt).format(d);
};

type Pending = { kind: 'suspend' | 'reactivate' | 'delete'; user: AdminUser };

/** The dashboard. Shown only after the database has confirmed the role; it checks again on every call. */
export function AdminView({ role }: { role: AdminRole }) {
  return <Dashboard role={role} />;
}

function Dashboard({ role }: { role: AdminRole }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | UserStatus>('all');
  const [pending, setPending] = useState<Pending | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const db = supabase();
    if (!db) return;
    try {
      const [u, a] = await Promise.all([listUsers(db), recentActions(db)]);
      setUsers(u);
      setActions(a);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load users.');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const shown = useMemo(() => filterUsers(users ?? [], query, status), [users, query, status]);
  const counts = useMemo(() => {
    const all = users ?? [];
    return {
      total: all.length,
      active: all.filter((u) => u.status === 'active').length,
      suspended: all.filter((u) => u.status === 'suspended').length,
      completed: all.filter((u) => u.onboarding === 'completed').length,
    };
  }, [users]);

  const onDone = async (message: string) => {
    setPending(null);
    setDone(message);
    await reload();
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-brand">{role === 'super_admin' ? 'Super admin' : 'Admin'}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Users</h1>
        <p className="mt-2 max-w-prose text-muted">
          Accounts, sign-up progress and access. Health answers, weights and check-in details stay private to each user. Every action here is
          recorded below.
        </p>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {done ? (
        <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-border bg-brand-soft px-4 py-3 text-sm">
          <span>{done}</span>
          <button type="button" onClick={() => setDone(null)} className="font-medium text-brand hover:underline">
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary">
        <Stat label="Users" value={counts.total} />
        <Stat label="Active" value={counts.active} />
        <Stat label="Suspended" value={counts.suspended} />
        <Stat label="Have targets" value={counts.completed} />
      </section>

      <section aria-label="User list" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Search by email</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email"
              className="h-12 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-brand"
            />
          </label>
          <div role="group" aria-label="Filter by status" className="flex rounded-xl border border-border bg-surface p-1">
            {(['all', 'active', 'suspended'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={`h-10 flex-1 rounded-lg px-4 text-sm font-medium capitalize sm:flex-none ${status === s ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surface-2'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {users === null && !error ? <div className="h-48 animate-pulse rounded-2xl bg-surface-2" aria-label="Loading users" /> : null}
        {users !== null && shown.length === 0 ? <Notice>No users match.</Notice> : null}

        {shown.length > 0 ? (
          <>
            {/* Phone: one card per user */}
            <ul className="space-y-3 lg:hidden">
              {shown.map((u) => (
                <li key={u.id} className="rounded-2xl border border-border bg-surface p-4">
                  <p className="break-all font-semibold">{u.email}</p>
                  <div className="mt-2">
                    <StatusBadge user={u} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Fact label="Progress" value={ONBOARDING_LABEL[u.onboarding]} />
                    <Fact label="Check-ins" value={String(u.checkins)} />
                    <Fact label="Joined" value={day(u.joined_at)} />
                    <Fact label="Last sign-in" value={day(u.last_sign_in_at)} />
                  </dl>
                  <Actions user={u} role={role} onPick={setPending} />
                </li>
              ))}
            </ul>

            {/* Laptop: a table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface lg:block">
              <table className="w-full text-left text-sm">
                <thead className="whitespace-nowrap border-b border-border bg-surface-2 text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-3 font-medium">Email</th>
                    <th scope="col" className="px-3 py-3 font-medium">Status</th>
                    <th scope="col" className="px-3 py-3 font-medium">Progress</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Check-ins</th>
                    <th scope="col" className="px-3 py-3 font-medium">Joined</th>
                    <th scope="col" className="px-3 py-3 font-medium">Last sign-in</th>
                    <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shown.map((u) => (
                    <tr key={u.id}>
                      <td className="max-w-56 truncate px-3 py-3 font-medium" title={u.email}>{u.email}</td>
                      <td className="px-3 py-3"><StatusBadge user={u} /></td>
                      <td className="whitespace-nowrap px-3 py-3">{ONBOARDING_LABEL[u.onboarding]}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{u.checkins}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted">{day(u.joined_at)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted">{day(u.last_sign_in_at)}</td>
                      <td className="px-3 py-3"><Actions user={u} role={role} onPick={setPending} compact /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section aria-labelledby="activity" className="space-y-3">
        <h2 id="activity" className="text-xl font-semibold">Recent admin activity</h2>
        {actions.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet.</p>
        ) : (
          <ol className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {actions.map((a, i) => (
              <li key={`${a.at}-${i}`} className="flex flex-col gap-0.5 px-4 py-3 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="min-w-0 break-words">
                  <span className="font-medium">{a.actor_email ?? 'Supabase SQL editor'}</span> · {describeAction(a)}
                </span>
                <time dateTime={a.at} className="shrink-0 text-muted">{timeFmt.format(new Date(a.at))}</time>
              </li>
            ))}
          </ol>
        )}
      </section>

      {pending ? <ConfirmDialog pending={pending} onCancel={() => setPending(null)} onDone={onDone} /> : null}
    </div>
  );
}

function Actions({ user, role, onPick, compact }: { user: AdminUser; role: AdminRole; onPick: (p: Pending) => void; compact?: boolean }) {
  if (user.admin_role) {
    return <p className={`text-xs text-muted ${compact ? 'whitespace-nowrap text-right' : 'mt-3'}`}>{compact ? 'Managed in Supabase' : 'Admin accounts are managed in Supabase'}</p>;
  }
  const btn = 'h-10 rounded-lg border px-3 text-sm font-medium';
  return (
    <div className={`flex gap-2 ${compact ? 'justify-end whitespace-nowrap' : 'mt-4'}`}>
      {user.status === 'suspended' ? (
        <button type="button" onClick={() => onPick({ kind: 'reactivate', user })} className={`${btn} border-border hover:bg-surface-2 ${compact ? '' : 'flex-1'}`}>
          Reactivate
        </button>
      ) : (
        <button type="button" onClick={() => onPick({ kind: 'suspend', user })} className={`${btn} border-border hover:bg-surface-2 ${compact ? '' : 'flex-1'}`}>
          Suspend
        </button>
      )}
      {role === 'super_admin' ? (
        <button
          type="button"
          onClick={() => onPick({ kind: 'delete', user })}
          className={`${btn} border-danger-border text-danger-text hover:bg-danger-bg ${compact ? '' : 'flex-1'}`}
        >
          Delete
        </button>
      ) : null}
    </div>
  );
}

const COPY = {
  suspend: {
    title: 'Suspend this user?',
    body: 'They will be signed out within the hour, cannot sign in again, and cannot see or change their data until you reactivate them. Nothing is deleted.',
    action: 'Suspend',
  },
  reactivate: { title: 'Reactivate this user?', body: 'They can sign in again and will find their data as they left it.', action: 'Reactivate' },
  delete: {
    title: 'Delete this user for good?',
    body: 'Their account, answers, weigh-ins and check-ins are erased and cannot be recovered. They could sign up again later as a new user.',
    action: 'Delete permanently',
  },
} as const;

function ConfirmDialog({ pending, onCancel, onDone }: { pending: Pending; onCancel: () => void; onDone: (message: string) => Promise<void> }) {
  const { kind, user } = pending;
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[kind];
  const canConfirm = kind !== 'delete' || typed.trim().toLowerCase() === user.email.toLowerCase();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const confirm = async () => {
    const db = supabase();
    if (!db) return;
    setBusy(true);
    setError(null);
    try {
      if (kind === 'delete') await deleteUser(db, user.id, typed);
      else await setUserStatus(db, user.id, kind === 'suspend' ? 'suspended' : 'active');
      await onDone(`${kind === 'delete' ? 'Deleted' : kind === 'suspend' ? 'Suspended' : 'Reactivated'} ${user.email}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-xl font-semibold">{copy.title}</h2>
        <p className="mt-1 break-all font-medium">{user.email}</p>
        <p className="mt-3 text-sm text-muted">{copy.body}</p>
        {kind === 'delete' ? (
          <label className="mt-4 block text-sm">
            <span className="font-medium">Type their email to confirm</span>
            <input
              autoFocus
              type="email"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-4 text-base outline-none focus:border-brand"
            />
          </label>
        ) : null}
        {error ? <div className="mt-4"><Notice tone="danger">{error}</Notice></div> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="h-12 rounded-xl border border-border px-5 font-medium hover:bg-surface-2">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={!canConfirm || busy}
            autoFocus={kind !== 'delete'}
            className={`h-12 rounded-xl px-5 font-semibold disabled:opacity-50 ${
              kind === 'delete' ? 'bg-danger-text text-surface' : 'bg-brand text-on-brand hover:bg-brand-strong'
            }`}
          >
            {busy ? 'Working…' : copy.action}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ user }: { user: AdminUser }) {
  const suspended = user.status === 'suspended';
  return (
    <span className="inline-flex shrink-0 flex-wrap gap-1">
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${suspended ? 'bg-danger-bg text-danger-text' : 'bg-brand-soft text-brand'}`}
      >
        {suspended ? 'Suspended' : 'Active'}
      </span>
      {user.admin_role ? (
        <span className="whitespace-nowrap rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
          {user.admin_role === 'super_admin' ? 'Super admin' : 'Admin'}
        </span>
      ) : null}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
