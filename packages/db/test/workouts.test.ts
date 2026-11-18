/** Workout sessions: each user reads, adds and removes only their own. */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrationsFolder, schema, SUPABASE_TEST_SHIM_SQL, withUser } from '../src/index.js';
import { freshDb, pgErrorCode, type Db } from './helpers.js';

const { users, workoutSessions } = schema;
const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';

const session = (userId: string, effort = 3) => ({
  id: randomUUID(),
  userId,
  performedOn: '2026-11-18',
  dayKey: 'fb_a',
  dayName: 'Full body A',
  plannerVersion: 'test',
  effort,
  exercises: [{ exerciseId: 'goblet_squat', name: 'Goblet squat', sets: [{ weightKg: 16, reps: 10 }] }],
  completedAt: new Date(),
});

describe('workout_sessions', () => {
  let db: Db;
  let aliceId: string;
  let bobId: string;

  beforeEach(async () => {
    db = await freshDb();
    aliceId = (await withUser(db, ALICE, (tx) => tx.insert(users).values({ authProviderId: ALICE, email: 'a@example.com' }).returning()))[0]!.id;
    bobId = (await withUser(db, BOB, (tx) => tx.insert(users).values({ authProviderId: BOB, email: 'b@example.com' }).returning()))[0]!.id;
    await withUser(db, BOB, (tx) => tx.insert(workoutSessions).values(session(bobId)));
  });

  it('users add and read their own workouts only', async () => {
    await withUser(db, ALICE, (tx) => tx.insert(workoutSessions).values(session(aliceId)));
    const mine = await withUser(db, ALICE, (tx) => tx.select().from(workoutSessions));
    expect(mine.map((r) => r.userId)).toEqual([aliceId]);
  });

  it("cannot add a workout for someone else, or delete theirs", async () => {
    expect(await pgErrorCode(withUser(db, ALICE, (tx) => tx.insert(workoutSessions).values(session(bobId))))).toBe('42501');
    await withUser(db, ALICE, (tx) => tx.delete(workoutSessions));
    expect(await db.select().from(workoutSessions)).toHaveLength(1);
  });

  it('rejects an effort outside 1–5', async () => {
    expect(await pgErrorCode(withUser(db, ALICE, (tx) => tx.insert(workoutSessions).values(session(aliceId, 9))))).toBe('23514');
  });
});

describe('supabase/update-2-workouts.sql', () => {
  it('upgrades a project set up before workouts, and Drizzle then sees nothing left to apply', async () => {
    const setup = readFileSync(new URL('../supabase/setup.sql', import.meta.url), 'utf8');
    const update = readFileSync(new URL('../supabase/update-2-workouts.sql', import.meta.url), 'utf8');
    const before = setup.slice(0, setup.indexOf('-- ===== 0007_workouts')) + setup.slice(setup.indexOf('-- ===== Access for signed-in users'));
    const client = new PGlite();
    await client.exec(SUPABASE_TEST_SHIM_SQL);
    await client.exec(before);
    await client.exec(update);
    // Later updates, in order, so Drizzle has nothing newer to apply.
    await client.exec(readFileSync(new URL('../supabase/update-3-admin-roles.sql', import.meta.url), 'utf8'));
    const count = async () => (await client.query<{ n: number }>('select count(*)::int as n from drizzle.__drizzle_migrations')).rows[0]!.n;
    const n = await count();
    await migrate(drizzle(client), { migrationsFolder });
    expect(await count()).toBe(n);
    const rls = await client.query(`select 1 from pg_class where relname = 'workout_sessions' and relrowsecurity`);
    expect(rls.rows).toHaveLength(1);
  });
});
