import { computeTargets } from '@fitness/calc-engine';
import { DISHES, generateWeekPlan, PlanError } from '@fitness/meal-planner';
import { describe, expect, it } from 'vitest';
import { toTargetsInput, type AssessmentDraft } from '@/lib/assessment';
import { localToday, nutrientRows, planRequestOf } from '@/lib/plan';

const draft: AssessmentDraft = {
  sex: 'male',
  ageYears: 32,
  heightCm: 172,
  weightKg: 78,
  occupation: 'sedentary',
  trainingDaysPerWeek: 4,
  sessionMinutes: 60,
  experience: 'intermediate',
  goal: 'fat_loss',
  weeklyRatePct: 0.5,
  dietType: 'eggetarian',
  allergies: ['peanut'],
  mealsPerDay: 4,
};
const targets = computeTargets(toTargetsInput(draft));

describe('planRequestOf', () => {
  it('builds a plan from the assessment that respects diet and allergies', () => {
    const plan = generateWeekPlan(planRequestOf(targets, draft, { variant: 0, excludeDishIds: [] }, '2026-11-23'));
    expect(plan.days).toHaveLength(7);
    for (const day of plan.days) {
      expect(day.meals).toHaveLength(4);
      for (const meal of day.meals) {
        for (const item of meal.items) {
          expect(item.code).not.toBe('T005'); // groundnut oil
          expect(item.code[0]).not.toMatch(/[NOPQRS]/); // no meat or fish
        }
      }
    }
  });

  it('leaves swapped-out dishes out, and shuffling changes the dishes', () => {
    const first = generateWeekPlan(planRequestOf(targets, draft, { variant: 0, excludeDishIds: [] }, '2026-11-23'));
    const swapped = first.days[0]!.meals[0]!.dishId;
    const after = generateWeekPlan(planRequestOf(targets, draft, { variant: 0, excludeDishIds: [swapped] }, '2026-11-23'));
    expect(after.days.flatMap((d) => d.meals.map((m) => m.dishId))).not.toContain(swapped);
    const shuffled = generateWeekPlan(planRequestOf(targets, draft, { variant: 1, excludeDishIds: [] }, '2026-11-23'));
    expect(shuffled.days.map((d) => d.meals.map((m) => m.dishId).join())).not.toEqual(first.days.map((d) => d.meals.map((m) => m.dishId).join()));
  });

  it('reports a clear error when every dish for a meal is swapped out', () => {
    const breakfasts = DISHES.filter((d) => d.slots.includes('breakfast')).map((d) => d.id);
    expect(() => generateWeekPlan(planRequestOf(targets, draft, { variant: 0, excludeDishIds: breakfasts }, '2026-11-23'))).toThrow(PlanError);
  });
});

describe('nutrientRows', () => {
  it('lists the day against targets in display order', () => {
    const rows = nutrientRows(
      { calories: 1900, proteinG: 120, carbsG: 200, fatG: 60, fibreG: 30 },
      { calories: 2000, proteinG: 150, carbsG: 200, fatG: 60, fibreG: 28 },
      { calories: true, protein: false, carbs: true, fat: true, fibre: true },
    );
    expect(rows.map((r) => r.label)).toEqual(['Calories', 'Protein', 'Carbs', 'Fat', 'Fibre']);
    expect(rows[1]).toMatchObject({ ok: false, kind: 'min', target: 150 });
  });
});

describe('localToday', () => {
  it('uses the local calendar date', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
