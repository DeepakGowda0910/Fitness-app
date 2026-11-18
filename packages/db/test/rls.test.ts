/**
 * Row-level security: a signed-in user can only reach their own rows, and
 * engine-owned tables are read-only to them.
 */
import { eq, sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { schema, withUser } from '../src/index.js';
import { freshDb, pgErrorCode, type Db } from './helpers.js';

const { users, userProfiles, assessments, assessmentAnswers, bodyMeasurements, nutritionTargets, consents, auditLogs } = schema;

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';

const target = (userId: string) => ({
  userId,
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
});

describe('row-level security', () => {
  let db: Db;
  let aliceId: string;
  let bobId: string;

  beforeEach(async () => {
    db = await freshDb();
    // Sign-up runs as the user themself.
    aliceId = (await withUser(db, ALICE, (tx) => tx.insert(users).values({ authProviderId: ALICE, email: 'a@example.com' }).returning()))[0]!.id;
    bobId = (await withUser(db, BOB, (tx) => tx.insert(users).values({ authProviderId: BOB, email: 'b@example.com' }).returning()))[0]!.id;
    // Engine writes (service role, bypasses RLS).
    await db.insert(nutritionTargets).values([target(aliceId), target(bobId)]);
    await db.insert(bodyMeasurements).values({ userId: bobId, measuredAt: new Date(), type: 'weight', value: 90, unit: 'kg', source: 'measured_device' });
    await db.insert(auditLogs).values({ action: 'read', entity: 'nutrition_targets', subjectUserId: bobId });
  });

  it('users see only their own account', async () => {
    const rows = await withUser(db, ALICE, (tx) => tx.select().from(users));
    expect(rows.map((r) => r.id)).toEqual([aliceId]);
  });

  it('cannot sign up as someone else', async () => {
    const code = await pgErrorCode(withUser(db, ALICE, (tx) => tx.insert(users).values({ authProviderId: BOB.replace('2', '3'), email: 'x@example.com' })));
    expect(code).toBe('42501');
  });

  it("cannot read another user's targets, measurements or audit log", async () => {
    const t = await withUser(db, ALICE, (tx) => tx.select().from(nutritionTargets));
    expect(t.map((r) => r.userId)).toEqual([aliceId]);
    expect(await withUser(db, ALICE, (tx) => tx.select().from(bodyMeasurements))).toHaveLength(0);
    expect(await withUser(db, ALICE, (tx) => tx.select().from(auditLogs))).toHaveLength(0);
    expect(await withUser(db, BOB, (tx) => tx.select().from(auditLogs))).toHaveLength(1);
  });

  it("cannot write rows for another user", async () => {
    const code = await pgErrorCode(
      withUser(db, ALICE, (tx) => tx.insert(bodyMeasurements).values({ userId: bobId, measuredAt: new Date(), type: 'weight', value: 50, unit: 'kg', source: 'user_estimate' })),
    );
    expect(code).toBe('42501');
  });

  it("updates and deletes on another user's rows affect nothing", async () => {
    await withUser(db, ALICE, (tx) => tx.update(bodyMeasurements).set({ value: 1 }).where(eq(bodyMeasurements.userId, bobId)));
    await withUser(db, ALICE, (tx) => tx.delete(bodyMeasurements).where(eq(bodyMeasurements.userId, bobId)));
    const [m] = await db.select().from(bodyMeasurements);
    expect(m!.value).toBe(90);
  });

  it('users can manage their own profile and assessment answers', async () => {
    await withUser(db, ALICE, async (tx) => {
      await tx.insert(userProfiles).values({ userId: aliceId, heightCm: 165, sexForCalculation: 'female' });
      const [a] = await tx.insert(assessments).values({ userId: aliceId, version: 1 }).returning();
      await tx.insert(assessmentAnswers).values({ assessmentId: a!.id, section: 'personal', questionKey: 'height_cm', value: 165 });
    });
    expect(await withUser(db, ALICE, (tx) => tx.select().from(assessmentAnswers))).toHaveLength(1);
    expect(await withUser(db, BOB, (tx) => tx.select().from(assessmentAnswers))).toHaveLength(0);
  });

  it("cannot add answers to another user's assessment", async () => {
    const [a] = await db.insert(assessments).values({ userId: bobId, version: 1 }).returning();
    const code = await pgErrorCode(
      withUser(db, ALICE, (tx) => tx.insert(assessmentAnswers).values({ assessmentId: a!.id, section: 'x', questionKey: 'y', value: 1 })),
    );
    expect(code).toBe('42501');
  });

  it('targets are read-only to users: only the engine writes them', async () => {
    const code = await pgErrorCode(withUser(db, ALICE, (tx) => tx.insert(nutritionTargets).values({ ...target(aliceId), version: 2 })));
    expect(code).toBe('42501');
  });

  it('users can record consent but not rewrite it', async () => {
    await withUser(db, ALICE, (tx) => tx.insert(consents).values({ userId: aliceId, purpose: 'health_data', granted: true, policyVersion: '1' }));
    await withUser(db, ALICE, (tx) => tx.delete(consents));
    expect(await db.select().from(consents)).toHaveLength(1);
  });

  it('a request with no signed-in user sees nothing', async () => {
    const rows = await db.transaction(async (tx) => {
      await tx.execute(sql`set local role anon`);
      return tx.select().from(nutritionTargets);
    });
    expect(rows).toHaveLength(0);
  });
});
