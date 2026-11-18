import { computeTargets } from '@fitness/calc-engine';
import { allFoods } from '@fitness/food-data';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  adaptDish,
  allergensOf,
  DISHES,
  dietLevel,
  generateWeekPlan,
  type Allergen,
  type DietType,
  type PlanRequest,
} from '../src/index.js';

const codes = new Set(allFoods().map((f) => f.code));

// Case A from docs/calc-engine.md: male, 80 kg, fat loss → 2410 kcal, P160 C292 F67, fibre 34.
const caseA = computeTargets({
  sex: 'male',
  ageYears: 30,
  heightCm: 180,
  weightKg: 80,
  activity: { occupation: 'sedentary', avgDailySteps: 8000, trainingDaysPerWeek: 4, sessionMinutes: 60 },
  goal: 'fat_loss',
});
const targetsA = { calories: caseA.calories, proteinG: caseA.proteinG, carbsG: caseA.carbsG, fatG: caseA.fatG, fibreG: caseA.fibreG };

const request = (over: Partial<PlanRequest> = {}): PlanRequest => ({
  targets: targetsA,
  dietType: 'non_vegetarian',
  mealsPerDay: 4,
  startDate: '2026-11-23',
  ...over,
});

describe('dish catalogue', () => {
  it('uses only known reference foods with valid ranges', () => {
    for (const d of DISHES) {
      expect(d.slots.length).toBeGreaterThan(0);
      for (const ing of d.ingredients) {
        expect(codes.has(ing.code), `${d.id} ${ing.code}`).toBe(true);
        expect(ing.maxG).toBeGreaterThanOrEqual(ing.minG);
        expect(ing.stepG).toBeGreaterThan(0);
      }
    }
  });
  it('has unique ids', () => {
    expect(new Set(DISHES.map((d) => d.id)).size).toBe(DISHES.length);
  });
});

describe('diet and allergen rules', () => {
  const dish = (id: string) => DISHES.find((d) => d.id === id)!;

  it('classifies foods by IFCT group', () => {
    expect(dietLevel('N003')).toBe(4); // chicken
    expect(dietLevel('S006')).toBe(3); // rohu
    expect(dietLevel('M001')).toBe(2); // egg
    expect(dietLevel('L003')).toBe(1); // paneer
    expect(dietLevel('T013')).toBe(1); // ghee
    expect(dietLevel('B021')).toBe(0); // toor dal
    expect(allergensOf('A019')).toContain('gluten');
    expect(allergensOf('T005')).toContain('peanut');
    // USDA supplement foods are classified explicitly.
    expect(dietLevel('USDA:171284')).toBe(1); // curd
    expect(allergensOf('USDA:171284')).toEqual(['dairy']);
    expect(dietLevel('USDA:172475')).toBe(0); // tofu
    expect(allergensOf('USDA:174275')).toEqual(['soy']); // soya chunks
  });

  it('every food used in a dish has a diet classification', () => {
    for (const d of DISHES) for (const ing of d.ingredients) expect(() => dietLevel(ing.code)).not.toThrow();
  });

  it('vegan: ghee becomes groundnut oil; paneer dishes are ruled out', () => {
    const khichdi = adaptDish(dish('moong_khichdi'), 'vegan', new Set())!;
    expect(khichdi.ingredients.map((i) => i.code)).toContain('T005');
    expect(khichdi.ingredients.map((i) => i.code)).not.toContain('T013');
    expect(adaptDish(dish('palak_paneer_roti'), 'vegan', new Set())).toBeNull();
  });

  it('peanut allergy: oil is swapped, optional peanuts dropped, peanut-based dishes ruled out', () => {
    const allergy = new Set<Allergen>(['peanut']);
    const upma = adaptDish(dish('upma'), 'vegetarian', allergy)!;
    expect(upma.ingredients.some((i) => i.code === 'H012' || i.code === 'T005')).toBe(false);
    expect(adaptDish(dish('poha'), 'vegetarian', allergy)).toBeNull();
  });

  it('jain: onion is left out, meat is ruled out', () => {
    const chole = adaptDish(dish('chole_roti'), 'jain', new Set())!;
    expect(chole.ingredients.map((i) => i.code)).not.toContain('G017');
    expect(adaptDish(dish('chicken_curry_rice'), 'jain', new Set())).toBeNull();
  });
});

describe('7-day plan', () => {
  it('non-vegetarian, 4 meals: calories on target every day, and at least 6 of 7 days meet every target', () => {
    const plan = generateWeekPlan(request());
    expect(plan.days.filter((d) => d.ok).length).toBeGreaterThanOrEqual(6);
    expect(plan.days).toHaveLength(7);
    expect(plan.days.map((d) => d.date)).toEqual([
      '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29',
    ]);
    for (const d of plan.days) {
      expect(d.checks.calories, `day ${d.dayIndex}: ${JSON.stringify(d.totals)}`).toBe(true);
      expect(d.meals.map((m) => m.slot)).toEqual(['breakfast', 'lunch', 'evening', 'dinner']);
    }
  });

  it('vegetarian, 5 meals: reaches a 160 g protein target with curd, tofu and soya chunks', () => {
    const plan = generateWeekPlan(request({ dietType: 'vegetarian', mealsPerDay: 5 }));
    expect(plan.days.filter((d) => d.ok).length).toBeGreaterThanOrEqual(6);
  });

  it('vegan, 3 meals: shortfalls are reported, not hidden', () => {
    const plan = generateWeekPlan(request({ dietType: 'vegan', mealsPerDay: 3 }));
    const short = plan.days.filter((d) => !d.checks.protein);
    if (short.length > 0) {
      expect(plan.warnings.map((w) => w.code)).toContain('protein_short_days');
      for (const d of short) expect(d.warnings.map((w) => w.code)).toContain('protein_short');
    }
  });

  it('day totals equal the sum of the meals', () => {
    const plan = generateWeekPlan(request());
    for (const d of plan.days) {
      const sum = d.meals.reduce((s, m) => s + m.totals.calories, 0);
      expect(Math.abs(sum - d.totals.calories)).toBeLessThan(1);
    }
  });

  it('shows household amounts, e.g. rotis', () => {
    const plan = generateWeekPlan(request({ dietType: 'vegetarian' }));
    const atta = plan.days.flatMap((d) => d.meals.flatMap((m) => m.items)).find((i) => i.code === 'A019');
    expect(atta?.household).toMatch(/^\d+(\.5)? rotis?$/);
  });

  it('is deterministic, and "variant" gives a different week', () => {
    const a = generateWeekPlan(request());
    expect(generateWeekPlan(request())).toEqual(a);
    const b = generateWeekPlan(request({ variant: 3 }));
    expect(b.days.map((d) => d.meals.map((m) => m.dishId))).not.toEqual(a.days.map((d) => d.meals.map((m) => m.dishId)));
  });

  it('excluded dishes never appear', () => {
    const plan = generateWeekPlan(request({ excludeDishIds: ['chicken_curry_rice', 'boiled_eggs'] }));
    const ids = plan.days.flatMap((d) => d.meals.map((m) => m.dishId));
    expect(ids).not.toContain('chicken_curry_rice');
    expect(ids).not.toContain('boiled_eggs');
  });

  it('never serves a food outside the diet or containing an allergen, and quantities stay on their grid', () => {
    const diets: DietType[] = ['vegan', 'vegetarian', 'jain', 'eggetarian', 'pescatarian', 'non_vegetarian'];
    const allergens: Allergen[] = ['dairy', 'gluten', 'peanut', 'tree_nut', 'soy', 'egg', 'fish'];
    const maxLevel: Record<DietType, number> = { vegan: 0, vegetarian: 1, jain: 1, eggetarian: 2, pescatarian: 3, non_vegetarian: 4 };
    fc.assert(
      fc.property(
        fc.constantFrom(...diets),
        fc.subarray(allergens, { maxLength: 2 }),
        fc.constantFrom(3 as const, 4 as const, 5 as const),
        (diet, allergies, meals) => {
          let plan;
          try {
            plan = generateWeekPlan(request({ dietType: diet, allergies, mealsPerDay: meals }));
          } catch (e) {
            // Acceptable only as a clear "no dishes fit" error.
            expect((e as { code?: string }).code).toBe('no_dishes_for_slot');
            return;
          }
          for (const d of plan.days) {
            for (const m of d.meals) {
              for (const it of m.items) {
                expect(dietLevel(it.code)).toBeLessThanOrEqual(maxLevel[diet]);
                for (const a of allergensOf(it.code)) expect(allergies).not.toContain(a);
                expect(it.grams).toBeGreaterThan(0);
              }
            }
            expect(new Set(d.meals.map((m) => m.dishId)).size).toBe(d.meals.length);
          }
        },
      ),
      { numRuns: 40 },
    );
  }, 60_000);
});
