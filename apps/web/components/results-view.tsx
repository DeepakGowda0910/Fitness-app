'use client';

import type { DayTargets, NutritionTargets } from '@fitness/calc-engine';
import Link from 'next/link';
import { GOALS, OCCUPATIONS, labelOf } from '@/lib/labels';
import { cloudEnabled, useAppData } from '@/lib/app-data';
import { useTargets } from '@/lib/targets';
import { Notice } from './fields';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

export function ResultsView() {
  const state = useTargets();
  if (state.status === 'loading') return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-label="Loading" />;
  if (state.status === 'incomplete') return <NoTargets started={Object.keys(state.draft).length > 0} />;
  return <Targets t={state.targets} active={state.active} adjusted={state.adjusted} />;
}

export function NoTargets({ started }: { started: boolean }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold">No targets yet</h1>
      <p className="mt-2 text-muted">Answer a few questions and we&apos;ll work out your calories and macros.</p>
      <Link href="/assessment" className="mt-6 inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-on-brand">
        {started ? 'Finish the assessment' : 'Start the assessment'}
      </Link>
    </div>
  );
}

function Targets({ t, active, adjusted }: { t: NutritionTargets; active: DayTargets; adjusted: boolean }) {
  const proteinKcal = active.proteinG * 4;
  const carbsKcal = active.carbsG * 4;
  const fatKcal = active.fatG * 9;
  const macroKcal = proteinKcal + carbsKcal + fatKcal;
  const pct = (k: number) => Math.round((k / macroKcal) * 100);
  const goalChanged = t.appliedGoal !== t.requestedGoal;
  const deficit = t.tdee.value - active.calories;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{labelOf(GOALS, t.appliedGoal)}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your daily targets</h1>
        </div>
        <Link href="/assessment" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2">
          Edit answers
        </Link>
      </div>

      {t.screening.requiresDoctorReview ? (
        <Notice tone="danger">
          <p className="font-semibold">Please check these targets with your doctor before you follow them.</p>
          <ul className="mt-1 list-disc pl-5">
            {t.screening.messages.map((m) => (
              <li key={m.code}>{m.message}</li>
            ))}
          </ul>
        </Notice>
      ) : t.screening.messages.length > 0 ? (
        <Notice tone="warn">
          <ul className="list-disc pl-5">
            {t.screening.messages.map((m) => (
              <li key={m.code}>{m.message}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      {adjusted ? (
        <Notice>
          Your weekly check-ins changed your calories from {fmt(t.calories)} to {fmt(active.calories)} kcal. Protein stays the same.{' '}
          <Link href="/checkin" className="font-medium text-brand underline">
            See check-ins
          </Link>
        </Notice>
      ) : null}

      {goalChanged ? (
        <Notice tone="warn">
          You chose &ldquo;{labelOf(GOALS, t.requestedGoal)}&rdquo;. Because of your health answers, these targets are for &ldquo;
          {labelOf(GOALS, t.appliedGoal)}&rdquo; instead.
        </Notice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="hero-card rounded-2xl bg-brand p-6 text-on-brand shadow-sm lg:col-span-1">
          <h2 className="text-sm font-medium opacity-90">Calories</h2>
          <p className="mt-1 text-5xl font-semibold tracking-tight">
            {fmt(active.calories)}
            <span className="ml-1 text-lg font-medium opacity-80">kcal/day</span>
          </p>
          <p className="mt-3 text-sm opacity-90">
            {deficit > 5
              ? `${fmt(deficit)} kcal below your estimated maintenance.`
              : deficit < -5
                ? `${fmt(-deficit)} kcal above your estimated maintenance.`
                : 'About your estimated maintenance.'}
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-medium text-muted">Macros</h2>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full" aria-hidden>
            <div className="bg-protein" style={{ width: `${pct(proteinKcal)}%` }} />
            <div className="bg-carbs" style={{ width: `${pct(carbsKcal)}%` }} />
            <div className="bg-fat" style={{ width: `${pct(fatKcal)}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <Macro name="Protein" grams={active.proteinG} share={pct(proteinKcal)} color="bg-protein" soft="bg-protein-soft" />
            <Macro name="Carbs" grams={active.carbsG} share={pct(carbsKcal)} color="bg-carbs" soft="bg-carbs-soft" />
            <Macro name="Fat" grams={active.fatG} share={100 - pct(proteinKcal) - pct(carbsKcal)} color="bg-fat" soft="bg-fat-soft" />
          </dl>
          <p className="mt-4 text-sm text-muted">
            Protein range for your goal: {fmt(t.proteinRangeG.min)} to {fmt(t.proteinRangeG.max)} g.
          </p>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat tone={1} label="Fibre" value={`${fmt(active.fibreG)} g`} note="At least" />
        <Stat tone={2} label="Water" value={`${(t.water.baseMl / 1000).toFixed(1)} L`} note={`Plus ${fmt(t.water.perTrainingHourMl.min)}–${fmt(t.water.perTrainingHourMl.max)} ml per training hour`} />
        <Stat tone={3} label="Maintenance (TDEE)" value={`${fmt(t.tdee.value)} kcal`} note={`Likely ${fmt(t.tdee.range.min)}–${fmt(t.tdee.range.max)}. Estimate`} />
        <Stat
          tone={4}
          label="Resting (BMR)"
          value={`${fmt(t.bmr.value)} kcal`}
          note={t.bmr.katchMcArdle ? `Mifflin-St Jeor. From body fat: ${fmt(t.bmr.katchMcArdle)}` : 'Mifflin-St Jeor. Estimate'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-semibold">How we worked this out</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <ActivityBreakdown t={t} />
            </li>
            {t.referenceWeightKg !== t.inputs.weightKg ? (
              <li>Protein and fat are set from a reference weight of {t.referenceWeightKg} kg rather than your current weight.</li>
            ) : null}
            {t.assumptions.map((m) => (
              <li key={m.code}>{m.message}</li>
            ))}
            {t.warnings.map((m) => (
              <li key={m.code} className="text-warn-text">
                {m.message}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            These are starting estimates from standard formulas, not medical advice. Weekly check-ins adjust them to how your body actually
            responds. Engine {t.engineVersion}.
          </p>
        </section>

        <section className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div>
            <h2 className="font-semibold">Your 7-day diet plan</h2>
            <p className="mt-2 text-sm text-muted">Indian meals with every quantity sized to these targets, for your diet and allergies.</p>
          </div>
          <Link
            href="/plan"
            className="mt-4 inline-flex h-11 w-fit items-center rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-strong"
          >
            See my diet plan
          </Link>
        </section>
      </div>

      <SavedWhere />
    </div>
  );
}

function Macro({ name, grams, share, color, soft }: { name: string; grams: number; share: number; color: string; soft: string }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${soft}`}>
      <dt className="flex items-center gap-2 text-sm text-muted">
        <span className={`size-2.5 rounded-full ${color}`} aria-hidden />
        {name}
      </dt>
      <dd className="mt-1 text-2xl font-semibold">
        {fmt(grams)}
        <span className="text-base font-medium text-muted"> g</span>
      </dd>
      <dd className="text-xs text-muted">{share}% of calories</dd>
    </div>
  );
}

function Stat({ tone, label, value, note }: { tone: 1 | 2 | 3 | 4; label: string; value: string; note: string }) {
  return (
    <section className={`tint tint-${tone} rounded-2xl border border-border bg-surface p-5 shadow-sm`}>
      <h2 className="text-sm text-muted">{label}</h2>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </section>
  );
}

function SavedWhere() {
  const { mode, email } = useAppData();
  return (
    <p className="text-xs text-muted">
      {mode === 'cloud' && email ? (
        <>Saved to your account ({email}).</>
      ) : email ? (
        <>Signed in as {email}, but your account hasn't loaded, so changes are kept in this browser for now.</>
      ) : cloudEnabled ? (
        <>
          Saved in this browser only.{' '}
          <Link href="/signin" className="font-medium text-brand underline">
            Sign in
          </Link>{' '}
          to keep it in your account and use it on other devices.
        </>
      ) : (
        <>Saved in this browser only.</>
      )}
    </p>
  );
}

/** Shows how the user's own answers built their activity factor. */
function ActivityBreakdown({ t }: { t: NutritionTargets }) {
  const a = t.activity;
  const { avgDailySteps, trainingDaysPerWeek, sessionMinutes, occupation } = t.inputs.activity;
  const capped = Math.abs(a.baseFactor + a.trainingAddition - a.factor) > 0.001;
  const rows: Array<[string, string]> = [
    [
      a.baseSource === 'steps'
        ? `Daily movement: ${fmt(avgDailySteps ?? 0)} steps`
        : `Daily movement: ${labelOf(OCCUPATIONS, occupation).toLowerCase()} (no step count)`,
      a.baseFactor.toFixed(2),
    ],
    [
      trainingDaysPerWeek > 0
        ? `Training: ${trainingDaysPerWeek} day${trainingDaysPerWeek === 1 ? '' : 's'} a week × ${sessionMinutes ?? 60} min`
        : 'Training: none',
      `+ ${a.trainingAddition.toFixed(2)}`,
    ],
  ];
  return (
    <div>
      <p className="font-medium text-text">How active you are</p>
      <dl className="mt-2 space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt>{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-border pt-1 font-medium text-text">
          <dt>Activity factor{capped ? ' (upper limit)' : ''}</dt>
          <dd className="tabular-nums">{a.factor.toFixed(2)}</dd>
        </div>
      </dl>
      <p className="mt-2">
        {a.factor.toFixed(2)} × resting energy {fmt(t.bmr.value)} kcal = maintenance {fmt(t.tdee.value)} kcal. Each 1,000 daily
        steps above 3,000 adds 0.03, and so does each hour of training a week, so moving more always means more food.
      </p>
    </div>
  );
}
