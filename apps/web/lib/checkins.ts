import {
  assessCheckin,
  policy,
  type CheckinAssessment,
  type CheckinWeek,
  type CurrentTargets,
  type DayTargets,
  type NutritionTargets,
  type WeighIn,
} from '@fitness/calc-engine';

/** A weigh-in, with when it was recorded so past check-ins can be replayed exactly. */
export interface StoredWeighIn extends WeighIn {
  /** ISO timestamp. */
  recordedAt: string;
}

/** The user's answers for one week, as submitted. */
export interface StoredCheckin extends CheckinWeek {
  /** ISO timestamp. */
  submittedAt: string;
  /** Compare over 4 weeks because of a menstrual cycle. */
  cycleAware: boolean;
}

/** Everything the user tracks after the assessment. */
export interface TrackingData {
  /**
   * ISO timestamp of the current assessment. Check-ins submitted at or before
   * it belong to earlier answers and no longer adjust targets.
   */
  since: string;
  weighIns: StoredWeighIn[];
  checkins: StoredCheckin[];
}

export interface WeekAnswers {
  daysLogged: number;
  dietAdherencePct: number;
  hunger: number;
  energy: number;
  sleepQuality: number;
}

export interface CheckinResult {
  checkin: StoredCheckin;
  assessment: CheckinAssessment;
  targetsAfter: CurrentTargets;
}

/** Minimum days between check-ins; a check-in measures one week of trend. */
export const MIN_DAYS_BETWEEN_CHECKINS = 6;

/** Identifies the assessment answers that produced the base targets. */
export function baseKeyOf(t: NutritionTargets): string {
  return JSON.stringify(t.inputs);
}

export function baseCurrentTargets(t: NutritionTargets): CurrentTargets {
  return { calories: t.calories, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG };
}

/** Check-ins that count for the current assessment, oldest first. */
export function activeCheckins(data: TrackingData): StoredCheckin[] {
  return data.checkins.filter((c) => c.submittedAt > data.since).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

function assess(base: NutritionTargets, current: CurrentTargets, weighIns: readonly WeighIn[], weeks: readonly StoredCheckin[]) {
  return assessCheckin({
    goal: base.appliedGoal,
    sex: base.inputs.sex,
    bmr: base.bmr.value,
    referenceWeightKg: base.referenceWeightKg,
    current,
    weeklyRatePct: base.inputs.weeklyRatePct,
    weighIns,
    weeks: weeks.map(({ submittedAt: _s, cycleAware: _c, ...w }) => w),
    cycleAware: weeks.at(-1)?.cycleAware ?? false,
    allowDeficit: base.screening.allowDeficit,
  });
}

/**
 * Re-runs every check-in through the engine, each seeing only the weigh-ins
 * recorded by the time it was submitted. Deterministic, so the browser and
 * any device signed in to the same account reach the same targets.
 */
export function replay(base: NutritionTargets, data: TrackingData): CheckinResult[] {
  const weeks = activeCheckins(data);
  const results: CheckinResult[] = [];
  let current = baseCurrentTargets(base);
  weeks.forEach((checkin, i) => {
    const weighIns = data.weighIns.filter((w) => w.recordedAt <= checkin.submittedAt);
    const assessment = assess(base, current, weighIns, weeks.slice(0, i + 1));
    current = assessment.newTargets ?? current;
    results.push({ checkin, assessment, targetsAfter: current });
  });
  return results;
}

/** The targets in force now: the latest check-in's, or the assessment's. */
export function activeTargets(base: NutritionTargets, results: readonly CheckinResult[]): CurrentTargets {
  return results.at(-1)?.targetsAfter ?? baseCurrentTargets(base);
}

/** Day targets for the meal plan: the active calories and macros, with fibre at the engine's rate. */
export function activeDayTargets(base: NutritionTargets, results: readonly CheckinResult[]): DayTargets {
  const t = activeTargets(base, results);
  return { ...t, fibreG: Math.round((policy.macros.fibrePer1000Kcal * t.calories) / 1000) };
}

/** Adds or replaces the weigh-in for a date, keeping the list in date order. */
export function withWeighIn(list: readonly StoredWeighIn[], w: StoredWeighIn): StoredWeighIn[] {
  return [...list.filter((x) => x.date !== w.date), w].sort((a, b) => a.date.localeCompare(b.date));
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Date of the next check-in, or null if one can be done now. */
export function nextCheckinDate(data: TrackingData, today: string): string | null {
  const last = activeCheckins(data).at(-1)?.weekEnd;
  if (!last || daysBetween(last, today) >= MIN_DAYS_BETWEEN_CHECKINS) return null;
  const d = new Date(`${last}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + MIN_DAYS_BETWEEN_CHECKINS);
  return d.toISOString().slice(0, 10);
}

/** Builds this week's check-in. Throws if one was done less than a week ago. */
export function newCheckin(data: TrackingData, answers: WeekAnswers, today: string, now: string, cycleAware: boolean): StoredCheckin {
  if (nextCheckinDate(data, today)) throw new Error('A check-in was done less than a week ago.');
  return { weekEnd: today, ...answers, submittedAt: now, cycleAware };
}
