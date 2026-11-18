import { policy } from './policy.js';
import type { Message } from './types.js';

/** One ingredient whose quantity the solver may change, in raw grams. */
export interface SolverItem {
  key: string;
  per100g: { proteinG: number; carbsG: number; fatG: number; fibreG: number };
  minG: number;
  maxG: number;
  /** Quantity changes in these steps (e.g. one roti's worth of atta, 5 g of oil). */
  stepG: number;
}

export interface DayTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
}

export interface NutrientTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
}

export interface ToleranceCheck {
  calories: boolean;
  protein: boolean;
  carbs: boolean;
  fat: boolean;
  fibre: boolean;
}

export interface SolverResult {
  grams: Record<string, number>;
  totals: NutrientTotals;
  checks: ToleranceCheck;
  /** True when every tolerance in the policy is met. */
  ok: boolean;
  warnings: Message[];
}

/**
 * Totals for a set of quantities. Energy uses the same 4/4/9 factors as the
 * targets, so a plan that matches its macros matches its calories.
 */
export function totalsFor(items: readonly SolverItem[], grams: Readonly<Record<string, number>>): NutrientTotals {
  const k = policy.macros.kcalPerG;
  let p = 0;
  let c = 0;
  let f = 0;
  let fi = 0;
  for (const it of items) {
    const g = (grams[it.key] ?? 0) / 100;
    p += it.per100g.proteinG * g;
    c += it.per100g.carbsG * g;
    f += it.per100g.fatG * g;
    fi += it.per100g.fibreG * g;
  }
  return {
    calories: round1(p * k.protein + c * k.carbs + f * k.fat),
    proteinG: round1(p),
    carbsG: round1(c),
    fatG: round1(f),
    fibreG: round1(fi),
  };
}

export function checkTolerances(t: NutrientTotals, target: DayTargets): ToleranceCheck {
  const tol = policy.mealPlan.tolerance;
  const within = (v: number, goal: number, pct: number) => Math.abs(v - goal) <= goal * pct;
  return {
    calories: within(t.calories, target.calories, tol.caloriesPct),
    protein: t.proteinG >= target.proteinG * tol.proteinMinRatio,
    carbs: within(t.carbsG, target.carbsG, tol.carbsPct),
    fat: within(t.fatG, target.fatG, tol.fatPct),
    fibre: t.fibreG >= target.fibreG * tol.fibreMinRatio,
  };
}

/** Weighted squared relative error. Protein and fibre are penalised mostly for falling short. */
function cost(t: NutrientTotals, target: DayTargets): number {
  const w = policy.mealPlan.weights;
  const rel = (v: number, goal: number) => (goal > 0 ? (v - goal) / goal : 0);
  const cal = rel(t.calories, target.calories);
  const pro = rel(t.proteinG, target.proteinG);
  const carb = rel(t.carbsG, target.carbsG);
  const fat = rel(t.fatG, target.fatG);
  const fib = rel(t.fibreG, target.fibreG);
  return (
    w.calories * cal * cal +
    (pro < 0 ? w.proteinShort : w.proteinExcess) * pro * pro +
    w.carbs * carb * carb +
    w.fat * fat * fat +
    (fib < 0 ? w.fibreShort : 0) * fib * fib
  );
}

/**
 * Chooses ingredient quantities, on each item's step grid, that best meet the
 * day's targets. Deterministic local search: single-item steps and paired
 * moves (one item up, another down) until no move improves the fit.
 */
export function solveDay(items: readonly SolverItem[], target: DayTargets): SolverResult {
  for (const it of items) {
    if (!(it.stepG > 0) || it.minG < 0 || it.maxG < it.minG) {
      throw new Error(`Invalid solver item ${it.key}: min ${it.minG}, max ${it.maxG}, step ${it.stepG}`);
    }
  }
  const snap = (it: SolverItem, g: number) => {
    const steps = Math.round((g - it.minG) / it.stepG);
    const maxSteps = Math.floor((it.maxG - it.minG) / it.stepG + 1e-9);
    return it.minG + Math.min(maxSteps, Math.max(0, steps)) * it.stepG;
  };

  // Start from the middle of every range.
  const grams: Record<string, number> = {};
  for (const it of items) grams[it.key] = snap(it, (it.minG + it.maxG) / 2);

  const movable = items.filter((it) => it.maxG > it.minG);
  let best = cost(totalsFor(items, grams), target);
  const maxIterations = policy.mealPlan.maxSolverIterations;

  for (let iter = 0; iter < maxIterations; iter++) {
    let bestMove: Array<[string, number]> | null = null;
    let bestCost = best;

    const tryMove = (move: Array<[string, number]>) => {
      for (const [key, g] of move) {
        const it = movable.find((m) => m.key === key)!;
        if (g < it.minG - 1e-9 || g > it.maxG + 1e-9) return;
      }
      const saved = move.map(([key]) => [key, grams[key]!] as [string, number]);
      for (const [key, g] of move) grams[key] = g;
      const c = cost(totalsFor(items, grams), target);
      for (const [key, g] of saved) grams[key] = g;
      if (c < bestCost - 1e-12) {
        bestCost = c;
        bestMove = move;
      }
    };

    for (const a of movable) {
      const ga = grams[a.key]!;
      tryMove([[a.key, ga + a.stepG]]);
      tryMove([[a.key, ga - a.stepG]]);
      for (const b of movable) {
        if (a === b) continue;
        tryMove([
          [a.key, ga + a.stepG],
          [b.key, grams[b.key]! - b.stepG],
        ]);
      }
    }

    if (!bestMove) break;
    for (const [key, g] of bestMove as Array<[string, number]>) grams[key] = round1(g);
    best = bestCost;
  }

  const totals = totalsFor(items, grams);
  const checks = checkTolerances(totals, target);
  const warnings: Message[] = [];
  if (!checks.protein) {
    warnings.push({
      code: 'protein_short',
      message: `This day reaches ${Math.round(totals.proteinG)} g of protein against a ${target.proteinG} g target. A higher-protein dish or a protein-rich snack would close the gap.`,
    });
  }
  if (!checks.calories) {
    warnings.push({
      code: 'calories_off',
      message: `This day comes to ${Math.round(totals.calories)} kcal against a ${target.calories} kcal target.`,
    });
  }
  return {
    grams,
    totals,
    checks,
    ok: checks.calories && checks.protein && checks.carbs && checks.fat && checks.fibre,
    warnings,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
