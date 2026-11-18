import { policy } from './policy.js';
import type { MeasurementSource, Message, Occupation, SexForCalculation } from './types.js';

/** Sources trusted enough to base Katch-McArdle on. */
const MEASURED_SOURCES: ReadonlySet<MeasurementSource> = new Set([
  'measured_device',
  'measured_manual',
  'professional',
]);

/**
 * Mifflin-St Jeor resting energy expenditure (kcal/day).
 * BMR = 10·W + 6.25·H − 5·A + s, with s = +5 (male) or −161 (female).
 */
export function mifflinStJeor(
  sex: SexForCalculation,
  weightKg: number,
  heightCm: number,
  ageYears: number,
): number {
  const s = sex === 'male' ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + s;
}

/** Katch-McArdle resting energy expenditure from lean body mass (kcal/day). */
export function katchMcArdle(weightKg: number, bodyFatPct: number): number {
  const leanMassKg = weightKg * (1 - bodyFatPct / 100);
  return 370 + 21.6 * leanMassKg;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function isMeasuredSource(source: MeasurementSource): boolean {
  return MEASURED_SOURCES.has(source);
}

export interface BmrResult {
  /** The value used for all further calculations. Always Mifflin-St Jeor. */
  value: number;
  formula: 'mifflin_st_jeor';
  /** Katch-McArdle, shown alongside when body fat was measured. */
  katchMcArdle?: number;
}

export function computeBmr(input: {
  sex: SexForCalculation;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  bodyFat?: { percent: number; source: MeasurementSource } | undefined;
}): BmrResult {
  const value = Math.round(mifflinStJeor(input.sex, input.weightKg, input.heightCm, input.ageYears));
  const result: BmrResult = { value, formula: 'mifflin_st_jeor' };
  if (input.bodyFat && isMeasuredSource(input.bodyFat.source)) {
    result.katchMcArdle = Math.round(katchMcArdle(input.weightKg, input.bodyFat.percent));
  }
  return result;
}

export interface ActivityInput {
  occupation: Occupation;
  /** Average daily steps, when known. Takes precedence over occupation. */
  avgDailySteps?: number | undefined;
  trainingDaysPerWeek: number;
  sessionMinutes?: number | undefined;
}

export interface ActivityResult {
  factor: number;
  baseFactor: number;
  baseSource: 'steps' | 'occupation';
  trainingAddition: number;
  assumptions: Message[];
}

/**
 * Activity factor (1.2–2.2): a non-exercise base from steps (preferred) or
 * occupation, plus an addition for planned training volume. Each part is
 * counted once, so more steps or more training always means more food.
 */
export function computeActivityFactor(input: ActivityInput): ActivityResult {
  const e = policy.energy;
  const assumptions: Message[] = [];

  let baseFactor: number;
  let baseSource: 'steps' | 'occupation';
  if (input.avgDailySteps !== undefined) {
    const steps = input.avgDailySteps;
    baseFactor = e.steps.sedentaryFactor + (Math.max(0, steps - e.steps.includedSteps) / 1000) * e.steps.perThousand;
    baseSource = 'steps';
  } else {
    baseFactor = e.occupationFactor[input.occupation];
    baseSource = 'occupation';
    assumptions.push({
      code: 'activity_from_occupation',
      message: 'Daily movement was estimated from your occupation because no step count was given.',
    });
  }

  let sessionMinutes = input.sessionMinutes;
  if (input.trainingDaysPerWeek > 0 && sessionMinutes === undefined) {
    sessionMinutes = e.defaultSessionMinutes;
    assumptions.push({
      code: 'default_session_length',
      message: `Training sessions were assumed to last ${e.defaultSessionMinutes} minutes.`,
    });
  }
  const trainingAddition =
    input.trainingDaysPerWeek * e.perTrainingDayPerHour * ((sessionMinutes ?? 0) / 60);

  const raw = baseFactor + trainingAddition;
  const factor = round3(Math.min(e.activityFactor.max, Math.max(e.activityFactor.min, raw)));
  return { factor, baseFactor: round3(baseFactor), baseSource, trainingAddition: round3(trainingAddition), assumptions };
}

export interface TdeeResult {
  value: number;
  activityFactor: number;
  /** Uncertainty band around the estimate. */
  range: { min: number; max: number };
}

export function computeTdee(bmr: number, activityFactor: number): TdeeResult {
  const value = Math.round(bmr * activityFactor);
  const u = policy.energy.tdeeUncertaintyPct;
  return {
    value,
    activityFactor,
    range: { min: Math.round(value * (1 - u)), max: Math.round(value * (1 + u)) },
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
