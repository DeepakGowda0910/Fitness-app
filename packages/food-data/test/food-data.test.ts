import { describe, expect, it } from 'vitest';
import { allFoods, energyFromMacros, ifct2017, searchFoods, usdaSupplement } from '../src/index.js';

const foods = ifct2017().foods;
const byCode = (code: string) => foods.find((f) => f.code === code)!;

describe('IFCT 2017 dataset', () => {
  it('has 542 foods with unique codes', () => {
    expect(foods).toHaveLength(542);
    expect(new Set(foods.map((f) => f.code)).size).toBe(542);
  });

  it('has plausible values for every food', () => {
    for (const f of allFoods()) {
      const n = f.per100g;
      for (const v of [n.proteinG, n.fatG, n.carbsG, n.fibreG, n.waterG]) expect(v).toBeGreaterThanOrEqual(0);
      // Components cannot meaningfully exceed 100 g. Analysed sums for some fish reach ~102.4 g in the source.
      expect(n.proteinG + n.fatG + n.carbsG + n.fibreG + n.waterG).toBeLessThanOrEqual(103);
    }
  });

  it('matches published values for known staples', () => {
    const rice = byCode('A015');
    expect(rice.name).toBe('Rice, raw, milled');
    expect(rice.per100g.proteinG).toBe(7.94);
    expect(rice.per100g.carbsG).toBe(78.24);

    const paneer = byCode('L003');
    expect(paneer.per100g.calciumMg).toBe(476);
    // Computed energy agrees with IFCT's published energy within 2%.
    expect(Math.abs(energyFromMacros(paneer.per100g) - paneer.per100g.energyKcalPublished)).toBeLessThan(paneer.per100g.energyKcalPublished * 0.02);
  });

  it('computed energy is close to published energy where IFCT gives one', () => {
    const published = foods.filter((f) => f.per100g.energyKcalPublished > 50);
    const close = published.filter(
      (f) => Math.abs(energyFromMacros(f.per100g) - f.per100g.energyKcalPublished) / f.per100g.energyKcalPublished < 0.1,
    );
    // IFCT also counts fibre and organic acids, so a few differ more.
    expect(close.length / published.length).toBeGreaterThan(0.9);
  });

  it('marks diet suitability', () => {
    expect(byCode('L003').diet.vegetarian).toBe(true);
    const chicken = foods.find((f) => f.name.startsWith('Chicken, poultry, breast'))!;
    expect(chicken.diet.vegetarian).toBe(false);
    const egg = foods.find((f) => f.name === 'Egg, poultry, whole, boiled')!;
    expect(egg.diet.vegetarian).toBe(false);
    expect(egg.diet.eggetarian).toBe(true);
  });
});

describe('searchFoods', () => {
  it('finds foods by local names', () => {
    expect(searchFoods('arhar dal')[0]!.code).toBe('B021');
    expect(searchFoods('Paneer')[0]!.code).toBe('L003');
  });
  it('ranks exact matches first and ignores empty queries', () => {
    expect(searchFoods('Ghee')[0]!.name).toBe('Ghee');
    expect(searchFoods('  ')).toEqual([]);
  });
});

describe('USDA supplement', () => {
  const usda = usdaSupplement().foods;

  it('adds curd, tofu and soya chunks with codes that cannot clash with IFCT', () => {
    expect(usda.map((f) => f.code)).toEqual(['USDA:171284', 'USDA:170886', 'USDA:172475', 'USDA:174275']);
    expect(allFoods()).toHaveLength(542 + usda.length);
    expect(new Set(allFoods().map((f) => f.code)).size).toBe(allFoods().length);
  });

  it('stores available carbohydrate (by difference minus fibre)', () => {
    const soya = usda.find((f) => f.code === 'USDA:174275')!;
    expect(soya.per100g.carbsG).toBeCloseTo(33.9 - 17.5, 6);
    expect(soya.per100g.proteinG).toBe(51.5);
  });

  it('computed energy (plus 2 kcal/g fibre, which the app does not count) is within 10% of USDA published energy', () => {
    for (const f of usda) {
      const e = energyFromMacros(f.per100g) + 2 * f.per100g.fibreG;
      expect(Math.abs(e - f.per100g.energyKcalPublished) / f.per100g.energyKcalPublished, f.name).toBeLessThan(0.1);
    }
  });

  it('is found by Indian names', () => {
    expect(searchFoods('dahi')[0]!.code).toMatch(/^USDA:/);
    expect(searchFoods('soya chunks')[0]!.code).toBe('USDA:174275');
  });
});
