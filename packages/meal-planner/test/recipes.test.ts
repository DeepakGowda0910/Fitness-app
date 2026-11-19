import { describe, expect, it } from 'vitest';
import {
  DISHES,
  formatAmount,
  generateWeekPlan,
  RECIPE_KEYS,
  RECIPES,
  recipeFor,
  recipeKeys,
  type Allergen,
  type DietType,
  type PlanRequest,
  type RecipeAmount,
} from '../src/index.js';

const targets = { calories: 2410, proteinG: 160, carbsG: 292, fatG: 67, fibreG: 34 };
const diets: DietType[] = ['vegan', 'vegetarian', 'jain', 'eggetarian', 'pescatarian', 'non_vegetarian'];
const allergySets: Allergen[][] = [[], ['peanut'], ['dairy'], ['gluten'], ['soy'], ['tree_nut', 'peanut']];

function plans() {
  const out: Array<{ diet: DietType; plan: ReturnType<typeof generateWeekPlan> }> = [];
  for (const dietType of diets)
    for (const allergies of allergySets)
      for (const mealsPerDay of [3, 5] as const)
        for (const variant of [0, 1, 2]) {
          const req: PlanRequest = { targets, dietType, allergies, mealsPerDay, startDate: '2026-11-23', variant };
          try {
            out.push({ diet: dietType, plan: generateWeekPlan(req) });
          } catch {
            // some combinations have no dishes for a slot; the planner reports that itself
          }
        }
  return out;
}

describe('recipes', () => {
  it('exist for every dish and only for known dishes', () => {
    const ids = new Set(DISHES.map((d) => d.id));
    for (const d of DISHES) expect(RECIPES[d.id], d.id).toBeDefined();
    for (const id of Object.keys(RECIPES)) expect(ids.has(id), id).toBe(true);
  });

  it('only name ingredients the dish has', () => {
    for (const d of DISHES) {
      const codes = new Set(d.ingredients.map((i) => i.code));
      for (const key of recipeKeys(d.id)) {
        const keyCodes = RECIPE_KEYS[key];
        expect(keyCodes, `${d.id}: unknown key {${key}}`).toBeDefined();
        expect(keyCodes!.some((c) => codes.has(c)), `${d.id}: {${key}} not in dish`).toBe(true);
      }
    }
  });

  const all = plans();

  it('fill every step with the plan’s own amounts, for every diet and allergy', () => {
    expect(all.length).toBeGreaterThan(50);
    for (const { diet, plan } of all)
      for (const day of plan.days)
        for (const meal of day.meals) {
          const recipe = recipeFor(meal, diet, { strict: true })!;
          expect(recipe).not.toBeNull();
          const amounts = recipe.steps.flat().filter((p): p is RecipeAmount => typeof p !== 'string');
          // Every ingredient of the meal appears in the recipe, at exactly the planned weight.
          for (const item of meal.items) {
            const hit = amounts.find((a) => a.code === item.code);
            expect(hit, `${meal.dishId} (${diet}) never mentions ${item.name}`).toBeDefined();
            expect(hit!.grams).toBe(item.grams);
          }
          // And nothing that is not in the meal.
          for (const a of amounts) expect(meal.items.some((i) => i.code === a.code)).toBe(true);
          const text = recipe.steps.flat().map((p) => (typeof p === 'string' ? p : formatAmount(p))).join(' ');
          expect(text).not.toMatch(/[{}]/);
        }
  });

  it('leave out onion, garlic and ginger for a Jain diet', () => {
    for (const { diet, plan } of all.filter((p) => p.diet === 'jain'))
      for (const day of plan.days)
        for (const meal of day.meals) {
          const r = recipeFor(meal, diet)!;
          const text = [...r.pantry, ...r.steps.flat().map((p) => (typeof p === 'string' ? p : formatAmount(p)))].join(' ').toLowerCase();
          expect(text, meal.dishId).not.toMatch(/onion|garlic|ginger/);
        }
  });

  it('do not change the plan', () => {
    const req: PlanRequest = { targets, dietType: 'non_vegetarian', mealsPerDay: 4, startDate: '2026-11-23' };
    const before = JSON.stringify(generateWeekPlan(req));
    for (const meal of generateWeekPlan(req).days.flatMap((d) => d.meals)) recipeFor(meal, 'non_vegetarian');
    expect(JSON.stringify(generateWeekPlan(req))).toBe(before);
  });

  it('format amounts in kitchen units', () => {
    expect(formatAmount({ code: 'A019', label: 'whole-wheat atta', grams: 60, household: '2 rotis' })).toBe('2 rotis (60 g whole-wheat atta)');
    expect(formatAmount({ code: 'M001', label: 'eggs', grams: 100, household: '2 eggs' })).toBe('2 eggs (100 g)');
    expect(formatAmount({ code: 'T005', label: 'groundnut oil', grams: 10, household: '2 tsp' })).toBe('10 g groundnut oil (2 tsp)');
    expect(formatAmount({ code: 'L003', label: 'paneer', grams: 120 })).toBe('120 g paneer');
  });
});
