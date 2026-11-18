import { readFileSync } from 'node:fs';

export interface FoodNutrientsPer100g {
  /** Energy as published by the source; 0 where the source gives none. */
  energyKcalPublished: number;
  proteinG: number;
  fatG: number;
  /** Available carbohydrate (excludes fibre). */
  carbsG: number;
  fibreG: number;
  sugarsG: number;
  waterG: number;
  calciumMg: number;
  ironMg: number;
  sodiumMg: number;
  potassiumMg: number;
}

export interface ReferenceFood {
  /** Source code, e.g. IFCT "A015". */
  code: string;
  name: string;
  /** Names in Indian languages, for search ("Arhar dal", "Akki"). */
  localNames: string[];
  group: string;
  diet: { vegetarian: boolean; eggetarian: boolean; pescatarian: boolean };
  per100g: FoodNutrientsPer100g;
}

export interface FoodDataset {
  source: 'IFCT_2017';
  version: string;
  foods: ReferenceFood[];
}

let cache: FoodDataset | undefined;

/**
 * Indian Food Composition Tables 2017 (ICMR-NIN), 542 foods, per 100 g edible
 * portion. Licence: personal use now; confirm commercial use with NIN before
 * launch (see data/NOTICE.md).
 */
export function ifct2017(): FoodDataset {
  cache ??= JSON.parse(readFileSync(new URL('../data/ifct2017.json', import.meta.url), 'utf8')) as FoodDataset;
  return cache;
}

/**
 * Energy from macros with the same factors the targets use (4/4/9), so plans
 * and targets add up the same way. Fibre energy is not counted.
 */
export function energyFromMacros(n: Pick<FoodNutrientsPer100g, 'proteinG' | 'carbsG' | 'fatG'>): number {
  return 4 * n.proteinG + 4 * n.carbsG + 9 * n.fatG;
}

/** Case-insensitive search over English and local names. Exact and prefix matches rank first. */
export function searchFoods(query: string, foods: readonly ReferenceFood[] = ifct2017().foods, limit = 20): ReferenceFood[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { food: ReferenceFood; score: number }[] = [];
  for (const food of foods) {
    const names = [food.name, ...food.localNames].map((n) => n.toLowerCase());
    let score = 0;
    for (const n of names) {
      if (n === q) score = Math.max(score, 3);
      else if (n.startsWith(q)) score = Math.max(score, 2);
      else if (n.includes(q)) score = Math.max(score, 1);
    }
    if (score > 0) scored.push({ food, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name))
    .slice(0, limit)
    .map((s) => s.food);
}
