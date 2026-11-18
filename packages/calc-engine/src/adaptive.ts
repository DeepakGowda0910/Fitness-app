import { policy } from './policy.js';
import type { Goal, Message, SexForCalculation } from './types.js';
import { ENGINE_VERSION } from './version.js';

export interface WeighIn {
  /** YYYY-MM-DD */
  date: string;
  weightKg: number;
}

export interface CheckinWeek {
  /** Last day of the check-in week, YYYY-MM-DD. */
  weekEnd: string;
  /** Share of planned meals followed, 0–100. */
  dietAdherencePct: number;
  /** Days with food logged, 0–7. */
  daysLogged: number;
  /** 1 (none) to 5 (extreme). */
  hunger: number;
  /** 1 (very low) to 5 (very high). */
  energy: number;
  /** 1 (very poor) to 5 (very good). */
  sleepQuality: number;
  /** Average logged intake that week, when known. Used only for observed TDEE. */
  avgIntakeKcal?: number | undefined;
}

export interface CurrentTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface AdaptiveInput {
  goal: Goal;
  sex: SexForCalculation;
  /** BMR from the current target version; a deficit never goes below it. */
  bmr: number;
  referenceWeightKg: number;
  current: CurrentTargets;
  /** Fat loss only: chosen weekly loss as % of body weight. */
  weeklyRatePct?: number | undefined;
  /** All weigh-ins available, any order. */
  weighIns: readonly WeighIn[];
  /** Check-in weeks, oldest first; the last one is the check-in being assessed. */
  weeks: readonly CheckinWeek[];
  /** User tracks a menstrual cycle: compare over 4 weeks instead of 1. */
  cycleAware?: boolean | undefined;
  /** False when safety screening forbids a deficit; calories are then never lowered. */
  allowDeficit?: boolean | undefined;
}

export type CheckinStatus =
  | 'on_track'
  | 'faster'
  | 'slower'
  | 'maintaining'
  | 'drifting_up'
  | 'drifting_down'
  | 'plateau'
  | 'adherence_issue'
  | 'recovery_issue'
  | 'insufficient_data';

export type CheckinDecision =
  | 'no_change'
  | 'increase'
  | 'decrease'
  | 'hold_for_adherence'
  | 'suggest_diet_break'
  | 'at_floor';

export interface CheckinAssessment {
  engineVersion: string;
  status: CheckinStatus;
  decision: CheckinDecision;
  /** Rule that produced the decision, stored for the audit trail. */
  ruleFired: string;
  /** Change in daily calories (kcal/day); 0 when nothing changes. */
  kcalChange: number;
  /** New targets when calories change; otherwise null. Protein is never changed. */
  newTargets: CurrentTargets | null;
  trendWeightKg: number | null;
  /** Signed weekly change of trend weight, % of body weight. */
  weeklyRatePct: number | null;
  targetWeeklyRatePct: number;
  /** Weeks the rate was measured over (1, or 4 when cycle-aware). */
  rateWindowWeeks: number;
  /** Maintenance estimated from intake and weight trend, once enough good weeks exist. */
  observedTdee: number | null;
  reasons: Message[];
}

const MS_PER_DAY = 86_400_000;
const DEFICIT_GOALS: ReadonlySet<Goal> = new Set(['fat_loss', 'recomposition']);

/**
 * Smooths weigh-ins with a time-aware exponential moving average, so one
 * high reading after a salty meal barely moves the trend. Returns one trend
 * point per weigh-in day, oldest first.
 */
export function trendWeights(weighIns: readonly WeighIn[]): WeighIn[] {
  const alpha = policy.adaptive.trendAlphaPerDay;
  // Average multiple weigh-ins on the same day first.
  const byDay = new Map<string, number[]>();
  for (const w of weighIns) {
    const list = byDay.get(w.date) ?? [];
    list.push(w.weightKg);
    byDay.set(w.date, list);
  }
  const days = [...byDay.keys()].sort();
  const out: WeighIn[] = [];
  let trend: number | null = null;
  let prevDay = 0;
  for (const date of days) {
    const values = byDay.get(date)!;
    const weight = values.reduce((a, b) => a + b, 0) / values.length;
    const day = toDay(date);
    if (trend === null) {
      trend = weight;
    } else {
      const gap = day - prevDay;
      const a = 1 - Math.pow(1 - alpha, gap);
      trend = trend + a * (weight - trend);
    }
    prevDay = day;
    out.push({ date, weightKg: trend });
  }
  return out;
}

/** Trend weight on a date: the latest trend point on or before it. */
export function trendAt(trend: readonly WeighIn[], date: string): number | null {
  const day = toDay(date);
  let value: number | null = null;
  for (const t of trend) {
    if (toDay(t.date) <= day) value = t.weightKg;
    else break;
  }
  return value;
}

function weeklyRate(trend: readonly WeighIn[], weekEnd: string, windowWeeks: number): number | null {
  const end = trendAt(trend, weekEnd);
  const start = trendAt(trend, fromDay(toDay(weekEnd) - 7 * windowWeeks));
  if (end === null || start === null) return null;
  return ((end - start) / start / windowWeeks) * 100;
}

function goodAdherence(w: CheckinWeek): boolean {
  const a = policy.adaptive.adherence;
  return w.dietAdherencePct >= a.minDietAdherencePct && w.daysLogged >= a.minDaysLogged;
}

function poorRecovery(w: CheckinWeek): boolean {
  const r = policy.adaptive.recovery;
  return w.hunger >= r.hungerAtLeast || w.energy <= r.energyAtMost || w.sleepQuality <= r.sleepQualityAtMost;
}

export function targetWeeklyRate(goal: Goal, weeklyRatePct?: number): number {
  switch (goal) {
    case 'fat_loss':
      return -(weeklyRatePct ?? policy.fatLoss.defaultWeeklyRatePct);
    case 'lean_gain':
    case 'weight_gain':
      return policy.adaptive.targetWeeklyRatePct[goal];
    default:
      return 0;
  }
}

/**
 * The weekly check-in decision. Pure and deterministic. The order of gates is
 * fixed: data → adherence → recovery → classify → adjust within limits.
 */
export function assessCheckin(input: AdaptiveInput): CheckinAssessment {
  const p = policy.adaptive;
  const reasons: Message[] = [];
  const target = targetWeeklyRate(input.goal, input.weeklyRatePct);
  const current = input.weeks.at(-1);
  const trend = trendWeights(input.weighIns);

  const base = {
    engineVersion: ENGINE_VERSION,
    kcalChange: 0,
    newTargets: null,
    targetWeeklyRatePct: round2(target),
    observedTdee: observedTdee(trend, input.weeks),
  };

  if (!current) {
    return {
      ...base,
      status: 'insufficient_data',
      decision: 'no_change',
      ruleFired: 'no_checkin',
      trendWeightKg: null,
      weeklyRatePct: null,
      rateWindowWeeks: 1,
      reasons: [{ code: 'no_checkin', message: 'No check-in to assess yet.' }],
    };
  }

  // Rate: 4-week average when cycle-aware and possible, else 1 week.
  let windowWeeks = 1;
  if (input.cycleAware) {
    if (weeklyRate(trend, current.weekEnd, p.cycleAwareWeeks) !== null && input.weeks.length >= p.cycleAwareWeeks) {
      windowWeeks = p.cycleAwareWeeks;
      reasons.push({
        code: 'cycle_aware_window',
        message: 'Because you track your cycle, we compared your average over the last 4 weeks.',
      });
    } else {
      reasons.push({
        code: 'cycle_aware_short_history',
        message: 'You track your cycle, but there are fewer than 4 weeks of data, so this week’s change may reflect water shifts.',
      });
    }
  }
  const rate = weeklyRate(trend, current.weekEnd, windowWeeks);
  const trendWeightKg = trendAt(trend, current.weekEnd);
  const common = {
    ...base,
    trendWeightKg: trendWeightKg === null ? null : round2(trendWeightKg),
    weeklyRatePct: rate === null ? null : round2(rate),
    rateWindowWeeks: windowWeeks,
  };

  if (rate === null || trendWeightKg === null) {
    return {
      ...common,
      status: 'insufficient_data',
      decision: 'no_change',
      ruleFired: 'insufficient_weigh_ins',
      reasons: [
        ...reasons,
        {
          code: 'insufficient_weigh_ins',
          message: 'We need weigh-ins from both this week and last week to see a trend. Targets stay the same.',
        },
      ],
    };
  }

  // Adherence gate.
  if (!goodAdherence(current)) {
    return {
      ...common,
      status: 'adherence_issue',
      decision: 'hold_for_adherence',
      ruleFired: 'adherence_gate',
      reasons: [
        ...reasons,
        {
          code: 'adherence_gate',
          message: `Targets stay the same this week. Changes need at least ${p.adherence.minDietAdherencePct}% plan adherence and ${p.adherence.minDaysLogged} days logged, so we can tell whether the plan itself needs adjusting.`,
        },
      ],
    };
  }

  // Recovery gate.
  const recent = input.weeks.slice(-p.recovery.consecutiveWeeks);
  if (recent.length === p.recovery.consecutiveWeeks && recent.every(poorRecovery)) {
    const deficit = DEFICIT_GOALS.has(input.goal);
    return {
      ...common,
      status: 'recovery_issue',
      decision: deficit ? 'suggest_diet_break' : 'no_change',
      ruleFired: 'recovery_gate',
      reasons: [
        ...reasons,
        {
          code: 'recovery_gate',
          message: deficit
            ? 'Hunger, energy or sleep has been poor for 2 weeks. We suggest a week at maintenance calories before cutting further.'
            : 'Hunger, energy or sleep has been poor for 2 weeks. Targets stay the same; focus on sleep and recovery.',
        },
      ],
    };
  }

  // Classify.
  let status: CheckinStatus;
  let direction: -1 | 0 | 1 = 0; // -1 = lower calories, +1 = raise
  if (target === 0) {
    if (Math.abs(rate) <= p.maintainingBandPct) status = 'maintaining';
    else if (rate > 0) {
      status = 'drifting_up';
      direction = -1;
    } else {
      status = 'drifting_down';
      direction = 1;
    }
  } else {
    const sign = Math.sign(target) as -1 | 1;
    const ratio = rate / target;
    if (isPlateau(trend, input.weeks, target, windowWeeks)) {
      status = 'plateau';
      direction = sign;
    } else if (ratio > p.fasterAbove) {
      status = 'faster';
      direction = (-sign) as -1 | 1;
    } else if (ratio < p.slowerBelow) {
      status = 'slower';
      direction = sign;
    } else {
      status = 'on_track';
    }
  }

  if (direction === 0) {
    return {
      ...common,
      status,
      decision: 'no_change',
      ruleFired: `classify_${status}`,
      reasons: [...reasons, { code: status, message: statusMessage(status) }],
    };
  }

  if (direction === -1 && input.allowDeficit === false) {
    return {
      ...common,
      status,
      decision: 'no_change',
      ruleFired: 'no_decrease_safety',
      reasons: [
        ...reasons,
        { code: status, message: statusMessage(status) },
        { code: 'no_decrease_safety', message: 'Because of your health screening, we do not lower calories. Please talk to your doctor.' },
      ],
    };
  }

  // Adjust: size the change from the gap between actual and target rate.
  const gapPct = Math.abs(target - rate);
  const rawKcal = ((gapPct / 100) * trendWeightKg * policy.energy.kcalPerKgBodyWeight) / 7;
  let kcal = clamp(roundTo(rawKcal, p.change.roundTo), p.change.min, p.change.max);
  let newCalories = input.current.calories + direction * kcal;

  if (direction === -1) {
    const floor = Math.max(policy.safety.calorieFloor[input.sex], input.bmr);
    if (input.current.calories <= floor) {
      return {
        ...common,
        status,
        decision: 'at_floor',
        ruleFired: 'calorie_floor',
        reasons: [
          ...reasons,
          { code: status, message: statusMessage(status) },
          {
            code: 'calorie_floor',
            message: 'Your calories are already at the safe minimum, so we will not lower them. More daily steps or a review with a dietitian are the next options.',
          },
        ],
      };
    }
    if (newCalories < floor) {
      newCalories = Math.ceil(floor);
      reasons.push({ code: 'calorie_floor_applied', message: 'The reduction was limited by your safe calorie minimum.' });
    }
  }

  const newTargets = redistribute(input.current, newCalories, input.referenceWeightKg);
  kcal = Math.abs(newTargets.calories - input.current.calories);
  if (kcal === 0) {
    return { ...common, status, decision: 'no_change', ruleFired: 'no_room_to_adjust', reasons };
  }

  return {
    ...common,
    status,
    decision: direction === 1 ? 'increase' : 'decrease',
    ruleFired: `adjust_${status}`,
    kcalChange: direction * kcal,
    newTargets,
    reasons: [
      ...reasons,
      { code: status, message: statusMessage(status) },
      {
        code: direction === 1 ? 'calories_up' : 'calories_down',
        message: `Daily calories ${direction === 1 ? 'go up' : 'go down'} by ${kcal} kcal, from carbs and fat. Protein stays the same.`,
      },
    ],
  };
}

function isPlateau(trend: readonly WeighIn[], weeks: readonly CheckinWeek[], target: number, windowWeeks: number): boolean {
  const p = policy.adaptive.plateau;
  const recent = weeks.slice(-p.weeks);
  if (recent.length < p.weeks || !recent.every(goodAdherence)) return false;
  if (windowWeeks > 1) {
    const last = recent.at(-1)!;
    const r = weeklyRate(trend, last.weekEnd, windowWeeks);
    return r !== null && r / target < p.belowRatio;
  }
  return recent.every((w) => {
    const r = weeklyRate(trend, w.weekEnd, 1);
    return r !== null && r / target < p.belowRatio;
  });
}

/**
 * Applies a calorie change to carbs and fat only. Fat scales with calories
 * but never drops below its minimum; carbs take the rest. Protein is fixed,
 * so calories never go below what protein plus minimum fat need.
 */
export function redistribute(current: CurrentTargets, newCalories: number, referenceWeightKg: number): CurrentTargets {
  const m = policy.macros;
  const k = m.kcalPerG;
  const fatMin = (cal: number) => Math.ceil(Math.max(m.minFatPerKg * referenceWeightKg, (m.minFatPct * cal) / k.fat));

  const proteinG = current.proteinG;
  const minCalories = proteinG * k.protein + fatMin(newCalories) * k.fat;
  const calories = Math.max(newCalories, minCalories);

  let fatG = Math.max(fatMin(calories), Math.round((current.fatG * calories) / current.calories));
  let remainder = calories - proteinG * k.protein - fatG * k.fat;
  if (remainder < 0) {
    fatG = fatMin(calories);
    remainder = calories - proteinG * k.protein - fatG * k.fat;
  }
  const carbsG = Math.max(0, Math.round(remainder / k.carbs));
  return { calories, proteinG, carbsG, fatG };
}

/**
 * Observed maintenance from the most recent run of good-adherence weeks with
 * logged intake: intake minus the energy in the trend-weight change.
 */
export function observedTdee(trend: readonly WeighIn[], weeks: readonly CheckinWeek[]): number | null {
  const n = policy.adaptive.observedTdeeMinWeeks;
  const run: CheckinWeek[] = [];
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = weeks[i]!;
    if (!goodAdherence(w) || w.avgIntakeKcal === undefined) break;
    run.unshift(w);
  }
  if (run.length < n) return null;
  const first = run[0]!;
  const last = run.at(-1)!;
  const start = trendAt(trend, fromDay(toDay(first.weekEnd) - 7));
  const end = trendAt(trend, last.weekEnd);
  if (start === null || end === null) return null;
  const days = toDay(last.weekEnd) - toDay(first.weekEnd) + 7;
  const avgIntake = run.reduce((s, w) => s + w.avgIntakeKcal!, 0) / run.length;
  return Math.round(avgIntake - ((end - start) * policy.energy.kcalPerKgBodyWeight) / days);
}

function statusMessage(status: CheckinStatus): string {
  switch (status) {
    case 'on_track':
      return 'Your trend weight is moving at the planned rate. No change needed.';
    case 'faster':
      return 'Your trend weight is changing faster than planned.';
    case 'slower':
      return 'Your trend weight is changing slower than planned.';
    case 'plateau':
      return 'Your trend weight has barely moved for 3 weeks despite good adherence.';
    case 'maintaining':
      return 'Your weight is stable, as planned.';
    case 'drifting_up':
      return 'Your trend weight is creeping up.';
    case 'drifting_down':
      return 'Your trend weight is creeping down.';
    default:
      return '';
  }
}

function toDay(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / MS_PER_DAY);
}

function fromDay(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
