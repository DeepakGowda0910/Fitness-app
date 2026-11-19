'use client';

import type { DayTargets } from '@fitness/calc-engine';
import { generateWeekPlan, PlanError, type PlannedDay, type PlannedMeal, type WeekPlan } from '@fitness/meal-planner';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AssessmentDraft } from '@/lib/assessment';
import { DIET_TYPES, labelOf } from '@/lib/labels';
import { DEFAULT_PLAN_SETTINGS, localToday, nutrientRows, planRequestOf, slotLabel, type PlanSettings } from '@/lib/plan';
import { useTargets } from '@/lib/targets';
import { Notice } from './fields';
import { MealRecipe } from './meal-recipe';
import { NoTargets } from './results-view';

const SETTINGS_KEY = 'fitness.plan.v1';
const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

function readSettings(): PlanSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_PLAN_SETTINGS, ...(JSON.parse(raw) as Partial<PlanSettings>) } : DEFAULT_PLAN_SETTINGS;
  } catch {
    return DEFAULT_PLAN_SETTINGS;
  }
}

function writeSettings(s: PlanSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore: settings last for this visit only
  }
}

export function PlanView() {
  const state = useTargets();
  if (state.status === 'loading') return <Skeleton />;
  if (state.status === 'incomplete') return <NoTargets started={Object.keys(state.draft).length > 0} />;
  return <Plan targets={state.active} adjusted={state.adjusted} draft={state.draft} />;
}

function Skeleton() {
  return <div className="h-[32rem] animate-pulse rounded-2xl bg-surface-2" aria-label="Loading" />;
}

type PlanResult = { plan: WeekPlan } | { error: string };

function Plan({ targets, adjusted, draft }: { targets: DayTargets; adjusted: boolean; draft: AssessmentDraft }) {
  const [settings, setSettings] = useState<PlanSettings | null>(null);
  const [startDate] = useState(localToday);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [dayIndex, setDayIndex] = useState(0);

  useEffect(() => setSettings(readSettings()), []);

  const update = useCallback((s: PlanSettings) => {
    setSettings(s);
    writeSettings(s);
  }, []);

  const request = useMemo(
    () => (settings ? planRequestOf(targets, draft, settings, startDate) : null),
    [targets, draft, settings, startDate],
  );

  // Generating takes a few hundred milliseconds; let the loading state paint first.
  useEffect(() => {
    if (!request) return;
    setResult(null);
    const id = window.setTimeout(() => {
      try {
        setResult({ plan: generateWeekPlan(request) });
      } catch (err) {
        setResult({ error: err instanceof PlanError ? err.message : 'Something went wrong building your plan.' });
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [request]);

  if (!settings || !result) return <Skeleton />;

  const swapped = settings.excludeDishIds.length;

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="eyebrow">
          {labelOf(DIET_TYPES, draft.dietType)} · {draft.mealsPerDay} meals a day · {fmt(targets.calories)} kcal{adjusted ? ' (updated by check-in)' : ''}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Your 7-day diet plan</h1>
      </div>
      <div className="flex gap-2">
        {swapped > 0 ? (
          <button
            type="button"
            onClick={() => update({ ...settings, excludeDishIds: [] })}
            className="h-10 rounded-xl border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2"
          >
            Bring back {swapped} dish{swapped === 1 ? '' : 'es'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => update({ ...settings, variant: settings.variant + 1 })}
          className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-strong"
        >
          Shuffle dishes
        </button>
      </div>
    </div>
  );

  if ('error' in result) {
    return (
      <div className="space-y-6">
        {header}
        <Notice tone="danger">
          {result.error} Bring back the dishes you swapped out, or change your food answers in the{' '}
          <Link href="/assessment" className="underline">
            assessment
          </Link>
          .
        </Notice>
      </div>
    );
  }

  const { plan } = result;
  const day = plan.days[Math.min(dayIndex, plan.days.length - 1)]!;

  return (
    <div className="space-y-6">
      {header}

      {plan.warnings.length > 0 ? (
        <Notice tone="warn">
          <ul className="list-disc pl-5">
            {plan.warnings.map((w) => (
              <li key={w.code}>{w.message}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <DayTabs days={plan.days} active={day.dayIndex} onSelect={setDayIndex} />

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6">
        <div className="meal-grid grid gap-4 md:grid-cols-2">
          {day.meals.map((meal, i) => (
            <MealCard
              tone={((i % 4) + 1) as 1 | 2 | 3 | 4}
              key={`${day.dayIndex}-${meal.slot}`}
              meal={meal}
              dietType={draft.dietType}
              onSwap={() => update({ ...settings, excludeDishIds: [...settings.excludeDishIds, meal.dishId] })}
            />
          ))}
        </div>
        <aside className="order-first lg:order-none lg:sticky lg:top-24">
          <DaySummary day={day} targets={targets} />
        </aside>
      </div>

      <p className="text-xs text-muted">
        Weights are raw ingredients before cooking. Nutrition from the Indian Food Composition Tables 2017 (and USDA for curd, tofu and soya
        chunks). Every quantity is calculated, not guessed. Planner {plan.plannerVersion}, engine {plan.engineVersion}.
      </p>
    </div>
  );
}

function DayTabs({ days, active, onSelect }: { days: PlannedDay[]; active: number; onSelect: (i: number) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="tablist" aria-label="Day">
      <div className="flex gap-2 lg:grid lg:grid-cols-7">
        {days.map((d) => {
          const date = new Date(`${d.date}T00:00:00`);
          const selected = d.dayIndex === active;
          return (
            <button
              key={d.dayIndex}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(d.dayIndex)}
              className={`flex min-w-16 shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-colors ${
                selected ? 'border-brand bg-brand text-on-brand' : 'border-border bg-surface hover:border-muted'
              }`}
            >
              <span className={`text-xs ${selected ? 'opacity-90' : 'text-muted'}`}>
                {date.toLocaleDateString('en-IN', { weekday: 'short' })}
              </span>
              <span className="text-lg font-semibold leading-tight">{date.getDate()}</span>
              <span
                className={`mt-1 size-1.5 rounded-full ${d.ok ? (selected ? 'bg-on-brand' : 'bg-brand') : 'bg-carbs'}`}
                aria-label={d.ok ? 'On target' : 'Slightly off target'}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MealCard({
  meal,
  tone,
  dietType,
  onSwap,
}: {
  meal: PlannedMeal;
  tone: 1 | 2 | 3 | 4;
  dietType: AssessmentDraft['dietType'];
  onSwap: () => void;
}) {
  return (
    <section className={`tint tint-${tone} flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tint-label text-xs font-medium uppercase tracking-wide text-muted">{slotLabel(meal.slot)}</p>
          <h2 className="mt-0.5 text-lg font-semibold leading-snug">{meal.dishName}</h2>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold">{fmt(meal.totals.calories)} kcal</p>
          <p className="text-xs text-muted">{fmt(meal.totals.proteinG)} g protein</p>
        </div>
      </div>
      <ul className="mt-3 flex-1 divide-y divide-border text-sm">
        {meal.items.map((it) => (
          <li key={it.code} className="flex justify-between gap-3 py-1.5">
            <span className="min-w-0 text-muted">{it.name}</span>
            <span className="shrink-0 text-right font-medium">
              {it.household ? `${it.household} · ` : ''}
              {fmt(it.grams)} g
            </span>
          </li>
        ))}
      </ul>
      <MealRecipe meal={meal} dietType={dietType} />
      <button
        type="button"
        onClick={onSwap}
        className="mt-3 h-9 w-fit rounded-lg px-2 text-sm font-medium text-brand hover:bg-brand-soft"
        title="Leave this dish out of your plan and pick another"
      >
        Swap this dish
      </button>
    </section>
  );
}

function DaySummary({ day, targets }: { day: PlannedDay; targets: DayTargets }) {
  const rows = nutrientRows(day.totals, targets, day.checks);
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-semibold">Day total</h2>
      <p className="text-sm text-muted">{day.ok ? 'Meets all your targets.' : 'Close to your targets, with small gaps marked !'}</p>
      <dl className="mt-4 space-y-3">
        {rows.map((r) => {
          const pct = Math.min(100, (r.value / r.target) * 100);
          return (
            <div key={r.key}>
              <div className="flex justify-between text-sm">
                <dt className="text-muted">{r.label}</dt>
                <dd>
                  <span className="font-semibold">{fmt(r.value)}</span>
                  <span className="text-muted">
                    {' '}
                    / {fmt(r.target)} {r.unit}
                    {r.kind === 'min' ? ' min' : ''}
                  </span>
                  <span className={`ml-2 ${r.ok ? 'text-brand' : 'text-carbs'}`} aria-label={r.ok ? 'on target' : 'off target'}>
                    {r.ok ? '✓' : '!'}
                  </span>
                </dd>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className={`h-full rounded-full ${r.ok ? 'bg-brand' : 'bg-carbs'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </dl>
      {day.warnings.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-warn-text">
          {day.warnings.map((w) => (
            <li key={w.code}>{w.message}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
