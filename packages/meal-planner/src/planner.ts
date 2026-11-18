import {
  ENGINE_VERSION,
  solveDay,
  totalsFor,
  type DayTargets,
  type Message,
  type NutrientTotals,
  type SolverItem,
  type ToleranceCheck,
} from '@fitness/calc-engine';
import { ifct2017, type ReferenceFood } from '@fitness/food-data';
import { adaptDish, type Allergen, type DietType } from './classify.js';
import { DISHES, type Dish, type MealSlot } from './dishes.js';

export const PLANNER_VERSION = '0.1.0';

export interface PlanRequest {
  targets: DayTargets;
  dietType: DietType;
  allergies?: readonly Allergen[];
  /** Dishes the user does not want. */
  excludeDishIds?: readonly string[];
  mealsPerDay: 3 | 4 | 5;
  /** First day of the plan, YYYY-MM-DD. */
  startDate: string;
  /** Changes which dishes are picked, for a "give me a different week" request. */
  variant?: number;
}

export interface PlannedItem {
  code: string;
  name: string;
  grams: number;
  /** Household amount when the ingredient has one, e.g. "2 roti". */
  household?: string;
}

export interface PlannedMeal {
  slot: MealSlot;
  dishId: string;
  dishName: string;
  items: PlannedItem[];
  totals: NutrientTotals;
}

export interface PlannedDay {
  dayIndex: number;
  date: string;
  meals: PlannedMeal[];
  totals: NutrientTotals;
  checks: ToleranceCheck;
  ok: boolean;
  warnings: Message[];
}

export interface WeekPlan {
  engineVersion: string;
  plannerVersion: string;
  request: PlanRequest;
  days: PlannedDay[];
  warnings: Message[];
}

const SLOTS_BY_MEALS: Record<PlanRequest['mealsPerDay'], MealSlot[]> = {
  3: ['breakfast', 'lunch', 'dinner'],
  4: ['breakfast', 'lunch', 'evening', 'dinner'],
  5: ['breakfast', 'mid_morning', 'lunch', 'evening', 'dinner'],
};

/** How many alternative dish combinations to try per day before keeping the best. */
const CANDIDATES_PER_DAY = 16;

/**
 * Builds a 7-day plan: picks dishes by rotation (deterministic, varied, never
 * the same dish twice in a day), then lets the solver set every quantity so
 * each day meets the targets. AI may later propose dishes; quantities and
 * nutrition always come from here.
 */
export function generateWeekPlan(request: PlanRequest, dishes: readonly Dish[] = DISHES): WeekPlan {
  const foods = new Map(ifct2017().foods.map((f) => [f.code, f]));
  const allergies = new Set(request.allergies ?? []);
  const excluded = new Set(request.excludeDishIds ?? []);
  const slots = SLOTS_BY_MEALS[request.mealsPerDay];
  const variant = request.variant ?? 0;
  const warnings: Message[] = [];

  const eligible = new Map<MealSlot, Dish[]>();
  for (const slot of slots) {
    const list = dishes
      .filter((d) => d.slots.includes(slot) && !excluded.has(d.id))
      .map((d) => adaptDish(d, request.dietType, allergies))
      .filter((d): d is Dish => d !== null)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (list.length === 0) {
      throw new PlanError('no_dishes_for_slot', `No dishes fit your diet and allergies for ${slot.replace('_', ' ')}.`);
    }
    if (list.length < 3) {
      warnings.push({
        code: 'low_variety',
        message: `Only ${list.length} dish${list.length === 1 ? '' : 'es'} fit your preferences for ${slot.replace('_', ' ')}, so meals will repeat.`,
      });
    }
    eligible.set(slot, list);
  }

  const days: PlannedDay[] = [];
  for (let day = 0; day < 7; day++) {
    let best: { day: PlannedDay; score: number } | null = null;
    for (let c = 0; c < CANDIDATES_PER_DAY; c++) {
      const combo = pickCombo(slots, eligible, day, variant, c);
      if (!combo) continue;
      const planned = planDay(combo, request.targets, foods, day, addDays(request.startDate, day));
      const score = planScore(planned, request.targets);
      if (!best || score < best.score) best = { day: planned, score };
      if (planned.ok) break;
    }
    days.push(best!.day);
  }

  const short = days.filter((d) => !d.checks.protein).length;
  if (short > 0) {
    warnings.push({
      code: 'protein_short_days',
      message: `${short} of 7 days fall short of your protein target with the current dishes. Adding a protein-rich snack (paneer, eggs, sprouts) will help.`,
    });
  }

  return { engineVersion: ENGINE_VERSION, plannerVersion: PLANNER_VERSION, request, days, warnings };
}

export class PlanError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Candidate c shifts the rotation so different days and retries see different dishes. */
function pickCombo(
  slots: readonly MealSlot[],
  eligible: ReadonlyMap<MealSlot, Dish[]>,
  day: number,
  variant: number,
  candidate: number,
): Array<[MealSlot, Dish]> | null {
  const used = new Set<string>();
  const combo: Array<[MealSlot, Dish]> = [];
  slots.forEach((slot, s) => {
    const list = eligible.get(slot)!;
    // Spread lunch and dinner apart in the rotation; candidates nudge each slot differently.
    const base = day + variant + Math.floor((s * list.length) / slots.length) + candidate * (s + 1);
    for (let k = 0; k < list.length; k++) {
      const dish = list[(base + k) % list.length]!;
      if (!used.has(dish.id) || k === list.length - 1) {
        used.add(dish.id);
        combo.push([slot, dish]);
        break;
      }
    }
  });
  return combo.length === slots.length ? combo : null;
}

function planDay(
  combo: ReadonlyArray<[MealSlot, Dish]>,
  targets: DayTargets,
  foods: ReadonlyMap<string, ReferenceFood>,
  dayIndex: number,
  date: string,
): PlannedDay {
  const items: SolverItem[] = [];
  combo.forEach(([, dish], m) => {
    for (const ing of dish.ingredients) {
      const food = foods.get(ing.code);
      if (!food) throw new Error(`Dish ${dish.id} uses unknown food ${ing.code}`);
      items.push({ key: `${m}:${ing.code}`, per100g: food.per100g, minG: ing.minG, maxG: ing.maxG, stepG: ing.stepG });
    }
  });

  const result = solveDay(items, targets);

  const meals: PlannedMeal[] = combo.map(([slot, dish], m) => {
    const mealItems = items.filter((it) => it.key.startsWith(`${m}:`));
    const planned: PlannedItem[] = dish.ingredients
      .map((ing) => {
        const grams = result.grams[`${m}:${ing.code}`] ?? 0;
        const item: PlannedItem = { code: ing.code, name: foods.get(ing.code)!.name, grams };
        if (ing.unit && grams > 0) {
          const n = Math.round((grams / ing.unit.gramsPerUnit) * 2) / 2;
          item.household = `${n} ${ing.unit.label}${n === 1 ? '' : ing.unit.label.endsWith('s') ? '' : 's'}`;
        }
        return item;
      })
      .filter((it) => it.grams > 0);
    return { slot, dishId: dish.id, dishName: dish.name, items: planned, totals: totalsFor(mealItems, result.grams) };
  });

  return { dayIndex, date, meals, totals: result.totals, checks: result.checks, ok: result.ok, warnings: result.warnings };
}

/** Lower is better: failed checks dominate, then distance from calories and protein. */
function planScore(day: PlannedDay, t: DayTargets): number {
  const failed = Object.values(day.checks).filter((ok) => !ok).length;
  const cal = Math.abs(day.totals.calories - t.calories) / t.calories;
  const pro = Math.max(0, t.proteinG - day.totals.proteinG) / t.proteinG;
  return failed * 10 + cal + pro;
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
