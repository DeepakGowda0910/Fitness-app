'use client';

import { trendWeights, type CheckinAssessment, type DayTargets, type WeighIn } from '@fitness/calc-engine';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { AssessmentDraft } from '@/lib/assessment';
import { useAppData } from '@/lib/app-data';
import { activeCheckins, nextCheckinDate, type CheckinResult, type StoredWeighIn, type TrackingData, type WeekAnswers } from '@/lib/checkins';
import { localToday } from '@/lib/plan';
import { useTargets } from '@/lib/targets';
import { ChoiceGroup, Fieldset, Notice, NumberField, YesNo } from './fields';
import { NoTargets } from './results-view';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export function CheckinView() {
  const state = useTargets();
  if (state.status === 'loading') return <div className="h-[32rem] animate-pulse rounded-2xl bg-surface-2" aria-label="Loading" />;
  if (state.status === 'incomplete') return <NoTargets started={Object.keys(state.draft).length > 0} />;
  return <Checkins active={state.active} draft={state.draft} results={state.results} />;
}

function Checkins({ active, draft, results }: { active: DayTargets; draft: AssessmentDraft; results: CheckinResult[] }) {
  const { tracking, submitCheckin } = useAppData();
  const today = localToday();
  // Show the result of a check-in submitted on this visit.
  const [showFor, setShowFor] = useState<string | null>(null);
  const shown = showFor ? results.find((r) => r.checkin.submittedAt === showFor) : undefined;
  const count = useRef(results.length);
  useEffect(() => {
    if (results.length > count.current) setShowFor(results.at(-1)!.checkin.submittedAt);
    count.current = results.length;
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand">
            Now: {fmt(active.calories)} kcal · {fmt(active.proteinG)} g protein · {fmt(active.carbsG)} g carbs · {fmt(active.fatG)} g fat
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Weekly check-in</h1>
        </div>
        <Link href="/plan" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2">
          Diet plan
        </Link>
      </div>

      {shown ? <ResultCard a={shown.assessment} onClose={() => setShowFor(null)} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <WeightCard today={today} />
        <WeekForm
          tracking={tracking}
          showCycle={draft.sex === 'female'}
          today={today}
          onSubmit={(answers, cycleAware) => {
            submitCheckin(answers, today, cycleAware);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>

      <History results={results} />

      <p className="text-xs text-muted">
        Check-ins compare the trend of your weigh-ins with your goal, and change calories by 50 to 150 kcal at most, only after a week you
        mostly stuck to the plan. Protein never changes.
      </p>
    </div>
  );
}

function WeightCard({ today }: { today: string }) {
  const { tracking, addWeighIn, removeWeighIn } = useAppData();
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | undefined>();
  const recent: StoredWeighIn[] = tracking.weighIns.slice(-60);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">Weight</h2>
      <p className="text-sm text-muted">Weigh in most mornings, after the toilet and before eating. The trend matters, not one day.</p>
      <form
        className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (kg === undefined || kg < 30 || kg > 300) return setError('Enter a weight between 30 and 300 kg.');
          if (!date || date > today) return setError('Choose today or an earlier date.');
          setError(undefined);
          addWeighIn(date, Math.round(kg * 10) / 10);
          setKg(undefined);
        }}
      >
        <div>
          <label htmlFor="wdate" className="mb-1 block text-base font-semibold">
            Date
          </label>
          <input
            id="wdate"
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-base"
          />
        </div>
        <NumberField label="Weight" unit="kg" value={kg} onChange={setKg} />
        <button type="submit" className="col-span-2 h-12 rounded-xl bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong sm:col-span-1">
          Save
        </button>
      </form>
      {error ? <p className="mt-2 text-sm font-medium text-danger-text">{error}</p> : null}

      {recent.length > 0 ? (
        <>
          <WeightChart weighIns={recent} />
          <ul className="mt-3 max-h-56 divide-y divide-border overflow-y-auto text-sm">
            {[...recent].reverse().map((w) => (
              <li key={w.date} className="flex items-center justify-between py-2">
                <span className="text-muted">{fmtDate(w.date)}</span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{w.weightKg.toFixed(1)} kg</span>
                  <button
                    type="button"
                    onClick={() => removeWeighIn(w.date)}
                    className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-text"
                    aria-label={`Remove weigh-in on ${fmtDate(w.date)}`}
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">No weigh-ins yet. Add today&apos;s to start your trend.</p>
      )}
    </section>
  );
}

/** Daily weigh-ins as dots, the smoothed trend as a line. */
function WeightChart({ weighIns }: { weighIns: WeighIn[] }) {
  if (weighIns.length < 2) return null;
  const trend = trendWeights(weighIns);
  const day = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;
  const x0 = day(weighIns[0]!.date);
  const x1 = Math.max(day(weighIns.at(-1)!.date), x0 + 1);
  const all = [...weighIns.map((w) => w.weightKg), ...trend.map((t) => t.weightKg)];
  const lo = Math.min(...all) - 0.5;
  const hi = Math.max(...all) + 0.5;
  const W = 320;
  const H = 120;
  const px = (d: string) => 8 + ((day(d) - x0) / (x1 - x0)) * (W - 16);
  const py = (kg: number) => 8 + ((hi - kg) / (hi - lo)) * (H - 16);
  const path = trend.map((t, i) => `${i ? 'L' : 'M'}${px(t.date).toFixed(1)},${py(t.weightKg).toFixed(1)}`).join(' ');
  const last = trend.at(-1)!;
  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" role="img" aria-label={`Weight trend, now ${last.weightKg.toFixed(1)} kg`}>
        {weighIns.map((w) => (
          <circle key={w.date} cx={px(w.date)} cy={py(w.weightKg)} r={2.5} className="fill-[var(--muted)] opacity-50" />
        ))}
        <path d={path} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="stroke-[var(--brand)]" />
      </svg>
      <figcaption className="flex justify-between text-xs text-muted">
        <span>{fmtDate(weighIns[0]!.date)}</span>
        <span>
          Trend <span className="font-semibold text-text">{last.weightKg.toFixed(1)} kg</span>
        </span>
        <span>{fmtDate(weighIns.at(-1)!.date)}</span>
      </figcaption>
    </figure>
  );
}

const ADHERENCE = [
  { value: 100, label: 'Every meal' },
  { value: 90, label: 'Almost every meal' },
  { value: 80, label: 'Most meals' },
  { value: 60, label: 'About half' },
  { value: 30, label: 'Not much' },
];

const scale = (labels: [string, string, string, string, string]) => labels.map((label, i) => ({ value: i + 1, label }));
const HUNGER = scale(['None', 'A little', 'Moderate', 'Often hungry', 'Very hungry']);
const ENERGY = scale(['Very low', 'Low', 'Normal', 'Good', 'Very good']);
const SLEEP = scale(['Very poor', 'Poor', 'OK', 'Good', 'Very good']);

function WeekForm({
  tracking,
  showCycle,
  today,
  onSubmit,
}: {
  tracking: TrackingData;
  showCycle: boolean;
  today: string;
  onSubmit: (a: WeekAnswers, cycleAware: boolean) => void;
}) {
  const [a, setA] = useState<Partial<WeekAnswers>>({});
  const [cycleAware, setCycleAware] = useState(activeCheckins(tracking).at(-1)?.cycleAware ?? false);
  const [tried, setTried] = useState(false);
  const due = nextCheckinDate(tracking, today);

  if (due) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">This week&apos;s check-in is done</h2>
        <p className="mt-1 text-sm text-muted">
          Your next check-in is on {fmtDate(due)}. Keep weighing in until then so the trend has enough data.
        </p>
      </section>
    );
  }

  const missing = (k: keyof WeekAnswers) => (tried && a[k] === undefined ? 'Choose one.' : undefined);
  const hasWeighIns = tracking.weighIns.length >= 2;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">How did this week go?</h2>
      <p className="text-sm text-muted">Takes a minute. Honest answers give better adjustments.</p>
      {!hasWeighIns ? (
        <div className="mt-4">
          <Notice tone="warn">Add at least two weigh-ins (ideally a week apart) so the check-in can see a trend.</Notice>
        </div>
      ) : null}
      <form
        className="mt-5 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          const { daysLogged, dietAdherencePct, hunger, energy, sleepQuality } = a;
          if (daysLogged === undefined || dietAdherencePct === undefined || hunger === undefined || energy === undefined || sleepQuality === undefined)
            return;
          onSubmit({ daysLogged, dietAdherencePct, hunger, energy, sleepQuality }, cycleAware);
          setA({});
          setTried(false);
        }}
      >
        <Fieldset legend="Days you followed or tracked your food" error={missing('daysLogged')}>
          <ChoiceGroup
            name="days"
            columns={4}
            value={a.daysLogged}
            onChange={(daysLogged) => setA({ ...a, daysLogged })}
            options={[0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: String(n) }))}
          />
        </Fieldset>
        <Fieldset legend="How closely did you stick to the plan?" error={missing('dietAdherencePct')}>
          <ChoiceGroup name="adherence" value={a.dietAdherencePct} options={ADHERENCE} onChange={(dietAdherencePct) => setA({ ...a, dietAdherencePct })} />
        </Fieldset>
        <Fieldset legend="Hunger" error={missing('hunger')}>
          <Scale name="hunger" value={a.hunger} options={HUNGER} onChange={(hunger) => setA({ ...a, hunger })} />
        </Fieldset>
        <Fieldset legend="Energy" error={missing('energy')}>
          <Scale name="energy" value={a.energy} options={ENERGY} onChange={(energy) => setA({ ...a, energy })} />
        </Fieldset>
        <Fieldset legend="Sleep" error={missing('sleepQuality')}>
          <Scale name="sleep" value={a.sleepQuality} options={SLEEP} onChange={(sleepQuality) => setA({ ...a, sleepQuality })} />
        </Fieldset>
        {showCycle ? (
          <YesNo
            label="I have a menstrual cycle"
            hint="Water shifts across the cycle can hide progress, so we compare over 4 weeks instead of 1."
            value={cycleAware}
            onChange={setCycleAware}
          />
        ) : null}
        <button type="submit" className="h-12 w-full rounded-xl bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong">
          Check in
        </button>
      </form>
    </section>
  );
}

/** 1–5 scale: five equal buttons on one row, label under the selected end points. */
function Scale({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: number | undefined;
  options: Array<{ value: number; label: string }>;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2" role="radiogroup">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              title={o.label}
              className={`flex h-12 cursor-pointer items-center justify-center rounded-xl border text-base font-semibold transition-colors ${
                checked ? 'border-brand bg-brand text-on-brand' : 'border-border bg-surface hover:border-muted'
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChange(o.value)} aria-label={o.label} />
              {o.value}
            </label>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{options[0]!.label}</span>
        <span className="font-medium text-text">{value ? options[value - 1]!.label : ''}</span>
        <span>{options.at(-1)!.label}</span>
      </div>
    </div>
  );
}

const DECISION_TITLE: Record<CheckinAssessment['decision'], (a: CheckinAssessment) => string> = {
  increase: (a) => `Calories up by ${fmt(a.kcalChange)} kcal`,
  decrease: (a) => `Calories down by ${fmt(Math.abs(a.kcalChange))} kcal`,
  no_change: () => 'No change this week',
  hold_for_adherence: () => 'Targets stay the same',
  suggest_diet_break: () => 'Time for a diet break',
  at_floor: () => 'Calories are at their safe minimum',
};

const STATUS_LABEL: Record<CheckinAssessment['status'], string> = {
  on_track: 'On track',
  faster: 'Faster than planned',
  slower: 'Slower than planned',
  maintaining: 'Holding steady',
  drifting_up: 'Drifting up',
  drifting_down: 'Drifting down',
  plateau: 'Plateau',
  adherence_issue: 'Plan was hard to follow',
  recovery_issue: 'Recovery is suffering',
  insufficient_data: 'Not enough data yet',
};

function ResultCard({ a, onClose }: { a: CheckinAssessment; onClose: () => void }) {
  const changed = a.newTargets !== null;
  return (
    <section className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${changed ? 'border-brand bg-brand-soft' : 'border-border bg-surface'}`} aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand">{STATUS_LABEL[a.status]}</p>
          <h2 className="text-2xl font-semibold tracking-tight">{DECISION_TITLE[a.decision](a)}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface-2" aria-label="Close">
          ✕
        </button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Fact label="Trend weight" value={a.trendWeightKg !== null ? `${a.trendWeightKg.toFixed(1)} kg` : '–'} />
        <Fact label="Change per week" value={a.weeklyRatePct !== null ? `${a.weeklyRatePct > 0 ? '+' : ''}${a.weeklyRatePct.toFixed(2)}%` : '–'} />
        <Fact label="Goal per week" value={`${a.targetWeeklyRatePct > 0 ? '+' : ''}${a.targetWeeklyRatePct.toFixed(2)}%`} />
        <Fact label="New calories" value={a.newTargets ? `${fmt(a.newTargets.calories)} kcal` : 'Unchanged'} />
      </dl>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
        {a.reasons.map((r) => (
          <li key={r.code}>{r.message}</li>
        ))}
      </ul>
      {changed ? (
        <Link href="/plan" className="mt-4 inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-strong">
          See the updated diet plan
        </Link>
      ) : null}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface/70 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

function History({ results }: { results: CheckinResult[] }) {
  if (results.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">Past check-ins</h2>
      <ul className="mt-3 divide-y divide-border">
        {[...results].reverse().map(({ assessment: a, targetsAfter, checkin }) => (
          <li key={checkin.submittedAt} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
            <span className="w-20 shrink-0 text-muted">{fmtDate(checkin.weekEnd)}</span>
            <span className="min-w-0 flex-1 font-medium">{DECISION_TITLE[a.decision](a)}</span>
            <span className="text-muted">{STATUS_LABEL[a.status]}</span>
            <span className="w-24 text-right font-semibold">{fmt(targetsAfter.calories)} kcal</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
