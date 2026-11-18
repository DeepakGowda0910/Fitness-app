import {
  assessCheckin,
  policy,
  type DayTargets,
  type CheckinAssessment,
  type CheckinWeek,
  type CurrentTargets,
  type NutritionTargets,
  type WeighIn,
} from '@fitness/calc-engine';

/** Weigh-ins and check-ins, kept in this browser until accounts are connected. */
export interface CheckinState {
  /**
   * The assessment these check-ins belong to. When the user edits the
   * assessment, targets start fresh and old adjustments no longer apply.
   */
  baseKey: string;
  weighIns: WeighIn[];
  weeks: CheckinWeek[];
  /** One per week, same order: what the engine decided and the targets after it. */
  results: Array<{ assessment: CheckinAssessment; targetsAfter: CurrentTargets }>;
  cycleAware: boolean;
}

export interface WeekAnswers {
  daysLogged: number;
  dietAdherencePct: number;
  hunger: number;
  energy: number;
  sleepQuality: number;
}

/** Minimum days between check-ins; a check-in measures one week of trend. */
export const MIN_DAYS_BETWEEN_CHECKINS = 6;

/** Identifies the assessment answers that produced the base targets. */
export function baseKeyOf(t: NutritionTargets): string {
  return JSON.stringify(t.inputs);
}

export function emptyState(baseKey: string): CheckinState {
  return { baseKey, weighIns: [], weeks: [], results: [], cycleAware: false };
}

/** Saved state if it belongs to these targets; otherwise a fresh start. */
export function stateFor(saved: CheckinState | null, base: NutritionTargets): CheckinState {
  const key = baseKeyOf(base);
  return saved && saved.baseKey === key ? saved : emptyState(key);
}

export function baseCurrentTargets(t: NutritionTargets): CurrentTargets {
  return { calories: t.calories, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG };
}

/** The targets in force now: the latest check-in's, or the assessment's. */
export function activeTargets(base: NutritionTargets, state: CheckinState): CurrentTargets {
  return state.results.at(-1)?.targetsAfter ?? baseCurrentTargets(base);
}

/** Adds or replaces the weigh-in for a date, keeping the list in date order. */
export function addWeighIn(state: CheckinState, w: WeighIn): CheckinState {
  const weighIns = [...state.weighIns.filter((x) => x.date !== w.date), w].sort((a, b) => a.date.localeCompare(b.date));
  return { ...state, weighIns };
}

export function removeWeighIn(state: CheckinState, date: string): CheckinState {
  return { ...state, weighIns: state.weighIns.filter((x) => x.date !== date) };
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Date of the next check-in, or null if one can be done now. */
export function nextCheckinDate(state: CheckinState, today: string): string | null {
  const last = state.weeks.at(-1)?.weekEnd;
  if (!last || daysBetween(last, today) >= MIN_DAYS_BETWEEN_CHECKINS) return null;
  const d = new Date(`${last}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + MIN_DAYS_BETWEEN_CHECKINS);
  return d.toISOString().slice(0, 10);
}

/**
 * Runs the weekly check-in through the engine and returns the new state.
 * Protein never changes; calories, carbs and fat change only when the engine
 * decides so.
 */
export function runCheckin(
  state: CheckinState,
  base: NutritionTargets,
  answers: WeekAnswers,
  today: string,
): { state: CheckinState; assessment: CheckinAssessment } {
  if (nextCheckinDate(state, today)) throw new Error('A check-in was done less than a week ago.');
  const week: CheckinWeek = { weekEnd: today, ...answers };
  const weeks = [...state.weeks, week];
  const current = activeTargets(base, state);
  const assessment = assessCheckin({
    goal: base.appliedGoal,
    sex: base.inputs.sex,
    bmr: base.bmr.value,
    referenceWeightKg: base.referenceWeightKg,
    current,
    weeklyRatePct: base.inputs.weeklyRatePct,
    weighIns: state.weighIns,
    weeks,
    cycleAware: state.cycleAware,
    allowDeficit: base.screening.allowDeficit,
  });
  const targetsAfter = assessment.newTargets ?? current;
  return {
    assessment,
    state: { ...state, weeks, results: [...state.results, { assessment, targetsAfter }] },
  };
}

/** Day targets for the meal plan: the active calories and macros, with fibre at the engine's rate. */
export function activeDayTargets(base: NutritionTargets, state: CheckinState): DayTargets {
  const t = activeTargets(base, state);
  return { ...t, fibreG: Math.round((policy.macros.fibrePer1000Kcal * t.calories) / 1000) };
}
