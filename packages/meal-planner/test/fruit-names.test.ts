import { describe, expect, it } from 'vitest';
import { DISHES, FRUIT_SIDES, generateWeekPlan, hasDisplayName, isFruit, type DietType } from '../src/index.js';

const targets = { calories: 2020, proteinG: 156, carbsG: 223, fatG: 56, fibreG: 28 };

describe('fruit', () => {
  it('every day of every plan has at least 100 g of fruit', () => {
    for (const dietType of ['vegan', 'vegetarian', 'jain', 'eggetarian', 'pescatarian', 'non_vegetarian'] as DietType[])
      for (const mealsPerDay of [3, 4, 5] as const)
        for (const variant of [0, 1, 2]) {
          const plan = generateWeekPlan({ targets, dietType, mealsPerDay, startDate: '2026-11-23', variant });
          for (const day of plan.days) {
            const fruitG = day.meals.flatMap((m) => m.items).filter((i) => isFruit(i.code)).reduce((s, i) => s + i.grams, 0);
            expect(fruitG, `${dietType} ${mealsPerDay} meals, day ${day.dayIndex}`).toBeGreaterThanOrEqual(100);
          }
        }
  }, 60_000);

  it('rotates the fruit side through the week', () => {
    const plan = generateWeekPlan({ targets, dietType: 'vegetarian', mealsPerDay: 3, startDate: '2026-11-23' });
    const fruits = new Set(plan.days.flatMap((d) => d.meals.flatMap((m) => m.items)).filter((i) => isFruit(i.code)).map((i) => i.code));
    expect(fruits.size).toBeGreaterThanOrEqual(4);
  });
});

describe('display names', () => {
  it('exist for every ingredient a plan can show', () => {
    const codes = new Set([...DISHES.flatMap((d) => d.ingredients.map((i) => i.code)), ...FRUIT_SIDES.map(([c]) => c), 'T012', 'T008']);
    for (const code of codes) expect(hasDisplayName(code), code).toBe(true);
  });
});
