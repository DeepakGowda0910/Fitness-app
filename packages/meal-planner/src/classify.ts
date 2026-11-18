import type { Dish, DishIngredient } from './dishes.js';

export type DietType = 'vegan' | 'vegetarian' | 'jain' | 'eggetarian' | 'pescatarian' | 'non_vegetarian';

export type Allergen = 'dairy' | 'gluten' | 'peanut' | 'tree_nut' | 'soy' | 'egg' | 'fish' | 'shellfish' | 'sesame';

/** 0 vegan · 1 vegetarian (dairy) · 2 egg · 3 fish · 4 meat */
type DietLevel = 0 | 1 | 2 | 3 | 4;

const DIET_LEVEL_ALLOWED: Record<DietType, DietLevel> = {
  vegan: 0,
  vegetarian: 1,
  jain: 1,
  eggetarian: 2,
  pescatarian: 3,
  non_vegetarian: 4,
};

/** IFCT group letter: N/O meat, P/Q/R/S fish and seafood, M egg, L milk products. */
export function dietLevel(code: string): DietLevel {
  const group = code[0];
  if (group === 'N' || group === 'O') return 4;
  if (group === 'P' || group === 'Q' || group === 'R' || group === 'S') return 3;
  if (group === 'M') return 2;
  if (group === 'L' || code === 'T013') return 1;
  return 0;
}

const ALLERGENS_BY_CODE: Record<string, Allergen[]> = {
  A019: ['gluten'],
  A022: ['gluten'],
  A024: ['gluten'],
  H001: ['tree_nut'],
  H005: ['tree_nut'],
  H018: ['tree_nut'],
  H021: ['tree_nut'],
  H012: ['peanut'],
  T005: ['peanut'],
  B024: ['soy'],
  B025: ['soy'],
  T011: ['soy'],
  H009: ['sesame'],
  H010: ['sesame'],
  H011: ['sesame'],
  T004: ['sesame'],
};

export function allergensOf(code: string): Allergen[] {
  const group = code[0];
  const out = new Set<Allergen>(ALLERGENS_BY_CODE[code] ?? []);
  if (group === 'L' || code === 'T013') out.add('dairy');
  if (group === 'M') out.add('egg');
  if (group === 'P' || group === 'S') out.add('fish');
  if (group === 'Q' || group === 'R') out.add('shellfish');
  return [...out];
}

/** Onion, garlic, ginger and root vegetables, which a Jain diet excludes. */
export function isJainExcluded(code: string): boolean {
  return code[0] === 'F' || ['G011', 'G012', 'G013', 'G014', 'G017', 'G018'].includes(code);
}

/** Cooking fats that can stand in for each other. Preference order for substitutes. */
const COOKING_FATS = ['T005', 'T012', 'T001', 'T006', 'T008', 'T013'];

function allowedIngredient(code: string, diet: DietType, allergies: ReadonlySet<Allergen>): boolean {
  if (dietLevel(code) > DIET_LEVEL_ALLOWED[diet]) return false;
  if (diet === 'jain' && isJainExcluded(code)) return false;
  return !allergensOf(code).some((a) => allergies.has(a));
}

/**
 * Adapts a dish to a diet and allergies, or returns null if it cannot be.
 * - A disallowed cooking fat is swapped for an allowed one (ghee → groundnut
 *   oil for vegans, groundnut oil → sunflower oil for a peanut allergy).
 * - Optional extras (minimum 0 g) are left out.
 * - For Jain diets, fixed aromatics (onion, garlic, ginger) are left out.
 * - Any other disallowed ingredient rules the dish out.
 */
export function adaptDish(dish: Dish, diet: DietType, allergies: ReadonlySet<Allergen>): Dish | null {
  const out: DishIngredient[] = [];
  for (const ing of dish.ingredients) {
    if (allowedIngredient(ing.code, diet, allergies)) {
      out.push(ing);
      continue;
    }
    if (COOKING_FATS.includes(ing.code)) {
      const sub = COOKING_FATS.find((c) => allowedIngredient(c, diet, allergies));
      if (!sub) return null;
      out.push({ ...ing, code: sub });
      continue;
    }
    if (ing.minG === 0) {
      continue; // optional extra (e.g. peanuts in upma): leave it out
    }
    if (diet === 'jain' && isJainExcluded(ing.code) && ing.minG === ing.maxG && allowedIngredient(ing.code, 'vegetarian', allergies)) {
      continue; // leave out the aromatic
    }
    return null;
  }
  return { ...dish, ingredients: out };
}
