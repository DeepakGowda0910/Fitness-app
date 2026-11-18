import { z } from 'zod';

export const sexSchema = z.enum(['male', 'female']);
export const goalSchema = z.enum([
  'fat_loss',
  'recomposition',
  'lean_gain',
  'weight_gain',
  'maintenance',
  'strength',
  'endurance',
]);
export const occupationSchema = z.enum(['sedentary', 'light', 'moderate', 'heavy']);
export const experienceSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const measurementSourceSchema = z.enum([
  'measured_device',
  'measured_manual',
  'professional',
  'user_estimate',
  'ai_estimate',
  'wearable_sync',
]);
export const healthConditionSchema = z.enum([
  'diabetes_insulin',
  'diabetes_sulfonylurea',
  'diabetes_other',
  'kidney_disease',
  'heart_disease',
  'thyroid',
  'other',
]);

export const targetsInputSchema = z.object({
  sex: sexSchema,
  ageYears: z.number().int().min(13).max(100),
  heightCm: z.number().min(120).max(230),
  weightKg: z.number().min(30).max(300),
  bodyFat: z
    .object({
      percent: z.number().min(3).max(70),
      source: measurementSourceSchema,
    })
    .optional(),
  activity: z.object({
    occupation: occupationSchema,
    avgDailySteps: z.number().int().min(0).max(60000).optional(),
    trainingDaysPerWeek: z.number().int().min(0).max(7),
    sessionMinutes: z.number().int().min(10).max(240).optional(),
  }),
  goal: goalSchema,
  experience: experienceSchema.default('beginner'),
  /** Fat loss only: desired weekly loss as % of body weight. */
  weeklyRatePct: z.number().min(0.1).max(1.0).optional(),
  screening: z
    .object({
      pregnant: z.boolean().optional(),
      breastfeeding: z.boolean().optional(),
      eatingDisorderHistory: z.boolean().optional(),
      conditions: z.array(healthConditionSchema).optional(),
      weightAffectingMedication: z.boolean().optional(),
    })
    .default({}),
});

/** What callers pass in (defaults may be omitted). */
export type TargetsInput = z.input<typeof targetsInputSchema>;
/** After validation and defaults. */
export type ValidatedTargetsInput = z.output<typeof targetsInputSchema>;

export const feasibilityInputSchema = z.object({
  goal: goalSchema,
  heightCm: z.number().min(120).max(230),
  currentWeightKg: z.number().min(30).max(300),
  targetWeightKg: z.number().min(30).max(300),
  /** ISO date (YYYY-MM-DD). */
  startDate: z.iso.date(),
  /** ISO date (YYYY-MM-DD). */
  targetDate: z.iso.date(),
});

export type FeasibilityInput = z.input<typeof feasibilityInputSchema>;
