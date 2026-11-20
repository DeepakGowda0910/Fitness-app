'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { AdminUser } from '@/lib/admin';
import {
  answerRows,
  clientInputs,
  ENERGY,
  HUNGER,
  scaleLabel,
  setLabel,
  SLEEP,
  workoutVolumeKg,
  type ClientInputs,
} from '@/lib/client-inputs';
import { supabase } from '@/lib/supabase';
import { Notice } from './ui';

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const dayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
/** Dates stored as YYYY-MM-DD are the client's own calendar day: show them as written, not shifted by time zone. */
const ymd = (s: string) => dayFmt.format(new Date(`${s.slice(0, 10)}T12:00:00Z`));
const when = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '–');
const kg = (v: number | string) => `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`;

type Tab = 'checkins' | 'workouts' | 'weight' | 'answers';

/** Everything one client entered, read-only. Opening it is recorded in the audit log. */
export function ClientInputsView({ user, onBack }: { user: AdminUser; onBack: () => void }) {
  const [data, setData] = useState<ClientInputs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('checkins');

  useEffect(() => {
    const db = supabase();
    if (!db) return;
    let cancelled = false;
    clientInputs(db, user.id).then(
      (d) => !cancelled && setData(d),
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load.'),
    );
    window.scrollTo({ top: 0 });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const tabs: Array<{ id: Tab; label: string; count?: number | undefined }> = [
    { id: 'checkins', label: 'Check-ins', count: data?.checkins.length },
    { id: 'workouts', label: 'Workouts', count: data?.workouts.length },
    { id: 'weight', label: 'Weigh-ins', count: data?.weigh_ins.length },
    { id: 'answers', label: 'Answers' },
  ];

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="-ml-2 rounded-lg px-2 py-1 text-sm font-medium text-brand hover:bg-surface-2">
        ← All users
      </button>
      <div>
        <h1 className="break-all text-2xl font-semibold tracking-tight sm:text-3xl">{user.email}</h1>
        <p className="mt-2 text-sm text-muted">
          Everything this client has entered, newest first. Read-only. Opening this page is recorded in the admin activity log.
        </p>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <div role="tablist" aria-label="Entries" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1 sm:flex">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-10 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-medium ${
              tab === t.id ? 'bg-brand text-on-brand' : 'text-muted hover:bg-surface-2'
            }`}
          >
            {t.label}
            {t.count !== undefined ? <span className="ml-1 tabular-nums opacity-80">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {!data && !error ? <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-label="Loading" /> : null}
      {data ? (
        <div role="tabpanel">
          {tab === 'checkins' ? <Checkins data={data} /> : null}
          {tab === 'workouts' ? <Workouts data={data} /> : null}
          {tab === 'weight' ? <Weighins data={data} /> : null}
          {tab === 'answers' ? <Answers data={data} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">{children}</p>;
}

function Checkins({ data }: { data: ClientInputs }) {
  if (data.checkins.length === 0) return <Empty>No weekly check-ins yet.</Empty>;
  return (
    <ul className="space-y-3">
      {data.checkins.map((c) => (
        <li key={`${c.week_end}-${c.submitted_at}`} className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Week ending {ymd(c.week_end)}</h3>
            <span className="text-sm text-muted">Sent {when(c.submitted_at)}</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
            <Fact label="Days followed" value={c.days_logged == null ? '–' : `${c.days_logged} of 7`} />
            <Fact label="Diet followed" value={c.diet_adherence_pct == null ? '–' : `${c.diet_adherence_pct}%`} />
            <Fact label="Hunger" value={scaleLabel(HUNGER, c.hunger)} />
            <Fact label="Energy" value={scaleLabel(ENERGY, c.energy)} />
            <Fact label="Sleep" value={scaleLabel(SLEEP, c.sleep_quality)} />
            {c.workout_adherence_pct != null ? <Fact label="Workouts followed" value={`${c.workout_adherence_pct}%`} /> : null}
            {c.cycle_phase ? <Fact label="Menstrual cycle" value="Taken into account" /> : null}
          </dl>
          {c.challenges ? <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">“{c.challenges}”</p> : null}
        </li>
      ))}
    </ul>
  );
}

function Workouts({ data }: { data: ClientInputs }) {
  if (data.workouts.length === 0) return <Empty>No workouts logged yet.</Empty>;
  return (
    <ul className="space-y-3">
      {data.workouts.map((w) => {
        const volume = workoutVolumeKg(w);
        return (
          <li key={`${w.performed_on}-${w.completed_at}`} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">
                {w.day_name} <span className="font-normal text-muted">· {ymd(w.performed_on)}</span>
              </h3>
              <span className="text-sm text-muted">
                {[w.duration_min ? `${w.duration_min} min` : null, w.effort ? `Effort ${w.effort}/5` : null, volume > 0 ? `${kg(volume)} moved` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <ul className="mt-3 divide-y divide-border text-sm">
              {w.exercises.map((e, i) => (
                <li key={`${e.exerciseId}-${i}`} className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between sm:gap-4">
                  <span className="font-medium">{e.name}</span>
                  <span className="text-muted sm:text-right">{e.sets.map(setLabel).join(', ')}</span>
                </li>
              ))}
            </ul>
            {w.notes ? <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">“{w.notes}”</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

function Weighins({ data }: { data: ClientInputs }) {
  if (data.weigh_ins.length === 0) return <Empty>No weigh-ins yet.</Empty>;
  const newest = Number(data.weigh_ins[0]!.value);
  const oldest = Number(data.weigh_ins[data.weigh_ins.length - 1]!.value);
  const change = newest - oldest;
  return (
    <div className="space-y-3">
      {data.weigh_ins.length > 1 ? (
        <p className="text-sm text-muted">
          {change === 0 ? 'No change' : `${change > 0 ? 'Up' : 'Down'} ${kg(Math.abs(change))}`} since the first weigh-in on{' '}
          {ymd(data.weigh_ins[data.weigh_ins.length - 1]!.measured_at)}.
        </p>
      ) : null}
      <ol className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {data.weigh_ins.map((m) => (
          <li key={m.measured_at} className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm">
            <span>{ymd(m.measured_at)}</span>
            <span className="font-semibold tabular-nums">{kg(m.value)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Answers({ data }: { data: ClientInputs }) {
  if (!data.assessment || Object.keys(data.assessment.answers).length === 0) return <Empty>No assessment answers yet.</Empty>;
  const a = data.assessment;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {a.status === 'completed' ? `Assessment finished ${when(a.completed_at)}` : 'Assessment not finished yet'}. Last changed {when(a.updated_at)}.
      </p>
      {answerRows(a.answers).map((g) => (
        <section key={g.section} className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-semibold">{g.section}</h3>
          <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {g.rows.map((r) => (
              <Fact key={r.label} label={r.label} value={r.value} />
            ))}
          </dl>
        </section>
      ))}
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
