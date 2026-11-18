import { ifct2017 } from '@fitness/food-data';
import { and, eq, sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema, seedIfct2017, withUser } from '../src/index.js';
import { freshDb, pgErrorCode, type Db } from './helpers.js';

const { foods, foodNutrients, foodSources, users } = schema;
const USER = '33333333-3333-4333-8333-333333333333';

describe('food reference data', () => {
  let db: Db;

  beforeAll(async () => {
    db = await freshDb();
    await seedIfct2017(db, ifct2017());
    await withUser(db, USER, (tx) => tx.insert(users).values({ authProviderId: USER, email: 'u@example.com' }));
  }, 60_000);

  it('imports all 542 IFCT foods with 11 nutrients each', async () => {
    const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(foods)) as [{ n: number }];
    expect(n).toBe(542);
    const [{ m }] = (await db.select({ m: sql<number>`count(*)::int` }).from(foodNutrients)) as [{ m: number }];
    expect(m).toBe(542 * 11);
  });

  it('stores per-100 g values exactly', async () => {
    const [row] = await db
      .select({ amount: foodNutrients.amountPer100g })
      .from(foodNutrients)
      .innerJoin(foods, eq(foods.id, foodNutrients.foodId))
      .where(and(eq(foods.externalId, 'B021'), eq(foodNutrients.nutrientCode, 'protein_g')));
    expect(row!.amount).toBe(21.7);
  });

  it('re-running the import changes nothing', async () => {
    await seedIfct2017(db, ifct2017());
    const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(foods)) as [{ n: number }];
    expect(n).toBe(542);
    expect(await db.select().from(foodSources)).toHaveLength(1);
  }, 60_000);

  it('signed-in users can read foods but not change them', async () => {
    const rows = await withUser(db, USER, (tx) => tx.select().from(foods).where(eq(foods.name, 'Paneer')));
    expect(rows).toHaveLength(1);
    await withUser(db, USER, (tx) => tx.update(foods).set({ name: 'x' }).where(eq(foods.name, 'Paneer')));
    expect(await db.select().from(foods).where(eq(foods.name, 'Paneer'))).toHaveLength(1);
    const code = await pgErrorCode(
      withUser(db, USER, (tx) => tx.insert(foodNutrients).values({ foodId: rows[0]!.id, nutrientCode: 'fake', amountPer100g: 1 })),
    );
    expect(code).toBe('42501');
  });
});
