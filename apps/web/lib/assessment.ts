import { targetsInputSchema, type TargetsInput } from '@fitness/calc-engine';
import type { Allergen, DietType } from '@fitness/meal-planner';

export type Sex = 'male' | 'female';
export type Occupation = 'sedentary' | 'light' | 'moderate' | 'heavy';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'fat_loss' | 'recomposition' | 'lean_gain' | 'weight_gain' | 'maintenance' | 'strength' | 'endurance';
export type HealthCondition =
  | 'diabetes_insulin'
  | 'diabetes_sulfonylurea'
  | 'diabetes_other'
  | 'kidney_disease'
  | 'heart_disease'
  | 'thyroid'
  | 'other';
export type BodyFatSource = 'measured_device' | 'professional' | 'user_estimate';

/** Answers as the user fills them in. Every field is optional until the step is validated. */
export interface AssessmentDraft {
  sex?: Sex | undefined;
  ageYears?: number | undefined;
  heightCm?: number | undefined;
  weightKg?: number | undefined;
  knowsBodyFat?: boolean | undefined;
  bodyFatPct?: number | undefined;
  bodyFatSource?: BodyFatSource | undefined;

  occupation?: Occupation | undefined;
  avgDailySteps?: number | undefined;
  trainingDaysPerWeek?: number | undefined;
  sessionMinutes?: number | undefined;
  experience?: Experience | undefined;

  goal?: Goal | undefined;
  weeklyRatePct?: number | undefined;

  pregnant?: boolean | undefined;
  breastfeeding?: boolean | undefined;
  eatingDisorderHistory?: boolean | undefined;
  conditions?: HealthCondition[] | undefined;
  weightAffectingMedication?: boolean | undefined;

  dietType?: DietType | undefined;
  allergies?: Allergen[] | undefined;
  mealsPerDay?: 3 | 4 | 5 | undefined;
}

export const STEPS = [
  { id: 'body', title: 'About you', blurb: 'Used to estimate how much energy your body uses.' },
  { id: 'activity', title: 'Activity', blurb: 'Daily movement and training change your needs the most.' },
  { id: 'goal', title: 'Goal', blurb: 'What you want to work towards.' },
  { id: 'health', title: 'Health check', blurb: 'Keeps your targets safe. Stays on this device.' },
  { id: 'food', title: 'Food', blurb: 'For your diet plan.' },
  { id: 'review', title: 'Review', blurb: 'Check your answers before we calculate.' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];

export type StepErrors = Partial<Record<keyof AssessmentDraft, string>>;

export const LIMITS = {
  ageYears: { min: 13, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 300 },
  bodyFatPct: { min: 3, max: 70 },
  avgDailySteps: { min: 0, max: 60000 },
  sessionMinutes: { min: 10, max: 240 },
} as const;

function range(errors: StepErrors, draft: AssessmentDraft, key: keyof typeof LIMITS, label: string, required: boolean) {
  const v = draft[key];
  const { min, max } = LIMITS[key];
  if (v === undefined) {
    if (required) errors[key] = `Enter your ${label}.`;
    return;
  }
  if (!Number.isFinite(v) || v < min || v > max) errors[key] = `${capitalise(label)} must be between ${min} and ${max}.`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Problems that stop the user leaving a step. Empty when the step is complete. */
export function validateStep(step: StepId, d: AssessmentDraft): StepErrors {
  const e: StepErrors = {};
  switch (step) {
    case 'body':
      if (!d.sex) e.sex = 'Choose one.';
      range(e, d, 'ageYears', 'age', true);
      if (d.ageYears !== undefined && !Number.isInteger(d.ageYears)) e.ageYears = 'Enter your age in whole years.';
      range(e, d, 'heightCm', 'height', true);
      range(e, d, 'weightKg', 'weight', true);
      if (d.knowsBodyFat) {
        range(e, d, 'bodyFatPct', 'body fat', true);
        if (!d.bodyFatSource) e.bodyFatSource = 'Tell us how it was measured.';
      }
      break;
    case 'activity':
      if (!d.occupation) e.occupation = 'Choose the closest match.';
      range(e, d, 'avgDailySteps', 'daily steps', false);
      if (d.trainingDaysPerWeek === undefined) e.trainingDaysPerWeek = 'Choose a number of days (0 is fine).';
      if ((d.trainingDaysPerWeek ?? 0) > 0) range(e, d, 'sessionMinutes', 'session length', true);
      if (!d.experience) e.experience = 'Choose one.';
      break;
    case 'goal':
      if (!d.goal) e.goal = 'Choose a goal.';
      if (d.goal === 'fat_loss' && d.weeklyRatePct === undefined) e.weeklyRatePct = 'Choose a pace.';
      break;
    case 'health':
      break;
    case 'food':
      if (!d.dietType) e.dietType = 'Choose how you eat.';
      if (!d.mealsPerDay) e.mealsPerDay = 'Choose how many meals.';
      break;
    case 'review':
      for (const s of STEPS) if (s.id !== 'review') Object.assign(e, validateStep(s.id, d));
      break;
  }
  return e;
}

/** The first step with a problem, so a returning user lands where they left off. */
export function firstIncompleteStep(d: AssessmentDraft): StepId {
  for (const s of STEPS) {
    if (s.id === 'review') return 'review';
    if (Object.keys(validateStep(s.id, d)).length > 0) return s.id;
  }
  return 'review';
}

/** Builds the engine's input. Throws if the draft is incomplete; call validateStep('review') first. */
export function toTargetsInput(d: AssessmentDraft): TargetsInput {
  const training = d.trainingDaysPerWeek ?? 0;
  const input: TargetsInput = {
    sex: d.sex!,
    ageYears: d.ageYears!,
    heightCm: d.heightCm!,
    weightKg: d.weightKg!,
    activity: {
      occupation: d.occupation!,
      trainingDaysPerWeek: training,
      ...(d.avgDailySteps !== undefined ? { avgDailySteps: d.avgDailySteps } : {}),
      ...(training > 0 && d.sessionMinutes !== undefined ? { sessionMinutes: d.sessionMinutes } : {}),
    },
    goal: d.goal!,
    experience: d.experience ?? 'beginner',
    ...(d.goal === 'fat_loss' && d.weeklyRatePct !== undefined ? { weeklyRatePct: d.weeklyRatePct } : {}),
    ...(d.knowsBodyFat && d.bodyFatPct !== undefined && d.bodyFatSource
      ? { bodyFat: { percent: d.bodyFatPct, source: d.bodyFatSource } }
      : {}),
    screening: {
      pregnant: d.sex === 'female' && !!d.pregnant,
      breastfeeding: d.sex === 'female' && !!d.breastfeeding,
      eatingDisorderHistory: !!d.eatingDisorderHistory,
      conditions: d.conditions ?? [],
      weightAffectingMedication: !!d.weightAffectingMedication,
    },
  };
  return targetsInputSchema.parse(input) as TargetsInput;
}

/** Drops answers that no longer apply after another answer changed. */
export function normalise(d: AssessmentDraft): AssessmentDraft {
  const out = { ...d };
  if (out.sex === 'male') {
    out.pregnant = undefined;
    out.breastfeeding = undefined;
  }
  if (out.goal !== 'fat_loss') out.weeklyRatePct = undefined;
  if (!out.knowsBodyFat) {
    out.bodyFatPct = undefined;
    out.bodyFatSource = undefined;
  }
  if (out.trainingDaysPerWeek === 0) out.sessionMinutes = undefined;
  return out;
}
