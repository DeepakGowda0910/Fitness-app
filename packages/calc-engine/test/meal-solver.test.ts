import { describe, expect, it } from 'vitest';
import { checkTolerances, solveDay, totalsFor, type SolverItem } from '../src/index.js';

// Two simple foods: "rice" (mostly carbs) and "dal" (protein + carbs) plus oil.
const rice: SolverItem = { key: 'rice', per100g: { proteinG: 8, carbsG: 78, fatG: 0.5, fibreG: 3 }, minG: 0, maxG: 400, stepG: 10 };
const dal: SolverItem = { key: 'dal', per100g: { proteinG: 22, carbsG: 55, fatG: 1.5, fibreG: 9 }, minG: 0, maxG: 300, stepG: 10 };
const oil: SolverItem = { key: 'oil', per100g: { proteinG: 0, carbsG: 0, fatG: 100, fibreG: 0 }, minG: 0, maxG: 60, stepG: 5 };

describe('meal solver', () => {
  it('computes totals with 4/4/9 energy', () => {
    const t = totalsFor([rice], { rice: 100 });
    expect(t.calories).toBeCloseTo(8 * 4 + 78 * 4 + 0.5 * 9, 6);
  });

  it('finds quantities that hit a reachable target', () => {
    // Target built from rice 200 g, dal 100 g, oil 30 g.
    const target = totalsFor([rice, dal, oil], { rice: 200, dal: 100, oil: 30 });
    const r = solveDay([rice, dal, oil], { ...target, calories: Math.round(target.calories) });
    expect(r.ok).toBe(true);
    expect(Math.abs(r.totals.calories - target.calories)).toBeLessThan(target.calories * 0.05);
  });

  it('keeps every quantity within its range and on its step grid', () => {
    const r = solveDay([rice, dal, oil], { calories: 5000, proteinG: 300, carbsG: 700, fatG: 150, fibreG: 60 });
    for (const it of [rice, dal, oil]) {
      const g = r.grams[it.key]!;
      expect(g).toBeGreaterThanOrEqual(it.minG);
      expect(g).toBeLessThanOrEqual(it.maxG);
      expect(Math.abs(((g - it.minG) / it.stepG) % 1)).toBeLessThan(1e-9);
    }
    // Unreachable target: reported, not faked.
    expect(r.ok).toBe(false);
    expect(r.warnings.map((w) => w.code)).toContain('calories_off');
  });

  it('fixed items stay fixed', () => {
    const onion: SolverItem = { key: 'onion', per100g: { proteinG: 1.5, carbsG: 9.6, fatG: 0.2, fibreG: 2.5 }, minG: 30, maxG: 30, stepG: 1 };
    const r = solveDay([rice, onion], { calories: 800, proteinG: 15, carbsG: 170, fatG: 2, fibreG: 7 });
    expect(r.grams.onion).toBe(30);
  });

  it('rejects invalid items', () => {
    expect(() => solveDay([{ ...rice, stepG: 0 }], { calories: 1, proteinG: 1, carbsG: 1, fatG: 1, fibreG: 1 })).toThrow();
  });

  it('applies the design tolerances', () => {
    const target = { calories: 2000, proteinG: 100, carbsG: 250, fatG: 60, fibreG: 30 };
    expect(checkTolerances({ calories: 2099, proteinG: 95, carbsG: 275, fatG: 54, fibreG: 27 }, target)).toEqual({
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      fibre: true,
    });
    expect(checkTolerances({ calories: 2101, proteinG: 94, carbsG: 276, fatG: 53, fibreG: 26 }, target)).toEqual({
      calories: false,
      protein: false,
      carbs: false,
      fat: false,
      fibre: false,
    });
  });
});
