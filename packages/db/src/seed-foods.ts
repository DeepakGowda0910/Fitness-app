import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { foodNutrients, foodSources, foods } from './schema.js';

/** Structural copy of @fitness/food-data's dataset type, so db does not depend on it at runtime. */
export interface ReferenceFoodInput {
  code: string;
  name: string;
  localNames: string[];
  group: string;
  diet: { vegetarian: boolean; eggetarian: boolean; pescatarian: boolean };
  per100g: { [K in NutrientField]: number };
}

/** camelCase field → stored nutrient code. */
const NUTRIENT_CODES = {
  energyKcalPublished: 'energy_kcal_published',
  proteinG: 'protein_g',
  fatG: 'fat_g',
  carbsG: 'carbs_g',
  fibreG: 'fibre_g',
  sugarsG: 'sugars_g',
  waterG: 'water_g',
  calciumMg: 'calcium_mg',
  ironMg: 'iron_mg',
  sodiumMg: 'sodium_mg',
  potassiumMg: 'potassium_mg',
} as const;

type NutrientField = keyof typeof NUTRIENT_CODES;

/**
 * Imports (or re-imports) IFCT 2017 foods. Idempotent: existing foods are
 * updated in place by (source, code) and their nutrients replaced.
 * Run with the service role.
 */
export async function seedIfct2017(
  db: PgDatabase<PgQueryResultHKT, Record<string, unknown>>,
  dataset: { version: string; foods: readonly ReferenceFoodInput[] },
): Promise<number> {
  return db.transaction(async (tx) => {
    const [source] = await tx
      .insert(foodSources)
      .values({
        code: 'IFCT_2017',
        name: 'Indian Food Composition Tables 2017 (ICMR-NIN)',
        version: dataset.version,
        licence: 'ICMR-NIN; personal use, commercial use to be confirmed',
      })
      .onConflictDoUpdate({ target: foodSources.code, set: { version: dataset.version } })
      .returning();

    for (const f of dataset.foods) {
      const [row] = await tx
        .insert(foods)
        .values({
          sourceId: source!.id,
          externalId: f.code,
          name: f.name,
          localNames: f.localNames,
          foodGroup: f.group,
          vegetarian: f.diet.vegetarian,
          eggetarian: f.diet.eggetarian,
          pescatarian: f.diet.pescatarian,
        })
        .onConflictDoUpdate({
          target: [foods.sourceId, foods.externalId],
          set: {
            name: sql`excluded.name`,
            localNames: sql`excluded.local_names`,
            foodGroup: sql`excluded.food_group`,
            vegetarian: sql`excluded.vegetarian`,
            eggetarian: sql`excluded.eggetarian`,
            pescatarian: sql`excluded.pescatarian`,
          },
        })
        .returning({ id: foods.id });

      const nutrients = (Object.keys(NUTRIENT_CODES) as NutrientField[]).map((k) => ({
        foodId: row!.id,
        nutrientCode: NUTRIENT_CODES[k],
        amountPer100g: f.per100g[k],
      }));
      await tx
        .insert(foodNutrients)
        .values(nutrients)
        .onConflictDoUpdate({
          target: [foodNutrients.foodId, foodNutrients.nutrientCode],
          set: { amountPer100g: sql`excluded.amount_per_100g` },
        });
    }
    return dataset.foods.length;
  });
}
