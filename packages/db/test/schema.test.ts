/**
 * Runs the real migrations against an in-memory Postgres (PGlite), so the
 * schema is tested without any hosted database or credentials.
 */
import { computeTargets } from '@fitness/calc-engine';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { schema } from '../src/index.js';
import { freshDb, pgErrorCode, type Db } from './helpers.js';

const { users, userProfiles, consents, nutritionTargets, weeklyCheckins, auditLogs } = schema;

async function createUser(db: Db, n = 1) {
  const [u] = await db
    .insert(users)
    .values({ authProviderId: `auth|${n}`, email: `user${n}@example.com` })
    .returning();
  return u!;
}

describe('schema', () => {
  let db: Db;
  beforeEach(async () => {
    db = await freshDb();
  });

  it('applies all migrations and defaults to India settings', async () => {
    const u = await createUser(db);
    expect(u.timezone).toBe('Asia/Kolkata');
    expect(u.locale).toBe('en-IN');
    expect(u.units).toBe('metric');
  });

  it('stores calc-engine targets with their inputs and engine version', async () => {
    const u = await createUser(db);
    const t = computeTargets({
      sex: 'male',
      ageYears: 30,
      heightCm: 180,
      weightKg: 80,
      activity: { occupation: 'sedentary', avgDailySteps: 8000, trainingDaysPerWeek: 4, sessionMinutes: 60 },
      goal: 'fat_loss',
    });
    const [row] = await db
      .insert(nutritionTargets)
      .values({
        userId: u.id,
        version: 1,
        effectiveFrom: '2026-11-18',
        bmr: t.bmr.value,
        tdee: t.tdee.value,
        calories: t.calories,
        proteinG: t.proteinG,
        carbsG: t.carbsG,
        fatG: t.fatG,
        fibreG: t.fibreG,
        waterMl: t.water.baseMl,
        formulaUsed: t.bmr.formula,
        inputsSnapshot: t.inputs,
        assumptions: t.assumptions,
        warnings: t.warnings,
        engineVersion: t.engineVersion,
        reason: 'initial',
      })
      .returning();
    expect(row!.calories).toBe(t.calories);
    expect((row!.inputsSnapshot as { weightKg: number }).weightKg).toBe(80);
  });

  it('targets are immutable: UPDATE is rejected', async () => {
    const u = await createUser(db);
    const [row] = await db
      .insert(nutritionTargets)
      .values({
        userId: u.id,
        version: 1,
        effectiveFrom: '2026-11-18',
        bmr: 1780,
        tdee: 2848,
        calories: 2410,
        proteinG: 160,
        carbsG: 292,
        fatG: 67,
        fibreG: 34,
        waterMl: 2800,
        formulaUsed: 'mifflin_st_jeor',
        inputsSnapshot: {},
        engineVersion: 'test',
        reason: 'initial',
      })
      .returning();
    const code = await pgErrorCode(db.update(nutritionTargets).set({ calories: 1000 }).where(eq(nutritionTargets.id, row!.id)));
    expect(code).toBe('23001');
  });

  it('consents and audit logs are append-only', async () => {
    const u = await createUser(db);
    await db.insert(consents).values({ userId: u.id, purpose: 'health_data', granted: true, policyVersion: '1' });
    expect(await pgErrorCode(db.update(consents).set({ granted: false }))).toBe('23001');
    await db.insert(auditLogs).values({ action: 'read', entity: 'nutrition_targets', subjectUserId: u.id });
    expect(await pgErrorCode(db.update(auditLogs).set({ action: 'x' }))).toBe('23001');
  });

  it('target versions are unique per user', async () => {
    const u = await createUser(db);
    const base = {
      userId: u.id,
      version: 1,
      effectiveFrom: '2026-11-18',
      bmr: 1780,
      tdee: 2848,
      calories: 2410,
      proteinG: 160,
      carbsG: 292,
      fatG: 67,
      fibreG: 34,
      waterMl: 2800,
      formulaUsed: 'mifflin_st_jeor',
      inputsSnapshot: {},
      engineVersion: 'test',
      reason: 'initial' as const,
    };
    await db.insert(nutritionTargets).values(base);
    expect(await pgErrorCode(db.insert(nutritionTargets).values(base))).toBe('23505');
  });

  it('rejects out-of-range check-in answers', async () => {
    const u = await createUser(db);
    const code = await pgErrorCode(
      db.insert(weeklyCheckins).values({ userId: u.id, weekNo: 1, weekEnd: '2026-11-25', dueAt: new Date(), hunger: 9 }),
    );
    expect(code).toBe('23514');
  });

  it('deleting a user removes their data but keeps the audit log', async () => {
    const u = await createUser(db);
    await db.insert(userProfiles).values({ userId: u.id, heightCm: 180, sexForCalculation: 'male' });
    await db.insert(consents).values({ userId: u.id, purpose: 'health_data', granted: true, policyVersion: '1' });
    await db.insert(auditLogs).values({ action: 'delete_account', entity: 'users', subjectUserId: u.id });
    await db.delete(users).where(eq(users.id, u.id));
    expect(await db.select().from(userProfiles)).toHaveLength(0);
    expect(await db.select().from(consents)).toHaveLength(0);
    expect(await db.select().from(auditLogs)).toHaveLength(1);
  });
});
