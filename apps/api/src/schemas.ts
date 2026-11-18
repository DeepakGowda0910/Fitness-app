import { goalSchema, sexSchema } from '@fitness/calc-engine';
import { z } from 'zod';

const isoDate = z.iso.date();

export const checkinAssessRequestSchema = z.object({
  goal: goalSchema,
  sex: sexSchema,
  bmr: z.number().min(500).max(5000),
  referenceWeightKg: z.number().min(30).max(300),
  current: z.object({
    calories: z.number().min(800).max(8000),
    proteinG: z.number().min(0).max(500),
    carbsG: z.number().min(0).max(1500),
    fatG: z.number().min(0).max(500),
  }),
  weeklyRatePct: z.number().min(0.1).max(1.0).optional(),
  weighIns: z.array(z.object({ date: isoDate, weightKg: z.number().min(30).max(300) })).max(400),
  weeks: z
    .array(
      z.object({
        weekEnd: isoDate,
        dietAdherencePct: z.number().min(0).max(100),
        daysLogged: z.number().int().min(0).max(7),
        hunger: z.number().int().min(1).max(5),
        energy: z.number().int().min(1).max(5),
        sleepQuality: z.number().int().min(1).max(5),
        avgIntakeKcal: z.number().min(0).max(10000).optional(),
      }),
    )
    .min(1)
    .max(60),
  cycleAware: z.boolean().optional(),
  allowDeficit: z.boolean().optional(),
});

export const dietTypeSchema = z.enum(['vegan', 'vegetarian', 'jain', 'eggetarian', 'pescatarian', 'non_vegetarian']);
export const allergenSchema = z.enum(['dairy', 'gluten', 'peanut', 'tree_nut', 'soy', 'egg', 'fish', 'shellfish', 'sesame']);

export const mealPlanRequestSchema = z.object({
  targets: z.object({
    calories: z.number().min(1000).max(6000),
    proteinG: z.number().min(20).max(400),
    carbsG: z.number().min(20).max(900),
    fatG: z.number().min(15).max(300),
    fibreG: z.number().min(5).max(80),
  }),
  dietType: dietTypeSchema,
  allergies: z.array(allergenSchema).max(9).default([]),
  excludeDishIds: z.array(z.string().max(64)).max(100).default([]),
  mealsPerDay: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  startDate: isoDate,
  variant: z.number().int().min(0).max(1000).default(0),
});

export const upsertMeRequestSchema = z
  .object({
    locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
    units: z.enum(['metric', 'imperial']),
    timezone: z.string().min(1).max(64),
  })
  .partial();
