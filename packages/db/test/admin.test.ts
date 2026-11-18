/**
 * Admin area (migrations/0006_admin_access.sql): only active admins can list,
 * suspend or delete users; every action is audited; nobody can make
 * themselves an admin or lift their own suspension through the Data API.
 */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrationsFolder, schema, SUPABASE_TEST_SHIM_SQL, withUser } from '../src/index.js';
import { freshDb, pgErrorCode, type Db } from './helpers.js';

const { users, adminRoles, auditLogs, assessments, bodyMeasurements, weeklyCheckins } = schema;

const OWNER = '11111111-1111-4111-8111-111111111111';
const HELPER = '22222222-2222-4222-8222-222222222222';
const CLIENT = '33333333-3333-4333-8333-333333333333';

type Row = Record<string, unknown>;
const rows = (r: unknown) => ((r as { rows?: Row[] }).rows ?? (r as Row[])) as Row[];

describe('admin area', () => {
  let db: Db;
  let ownerId: string;
  let helperId: string;
  let clientId: string;

  const as = <T,>(authId: string, q: ReturnType<typeof sql>) => withUser(db, authId, (tx) => tx.execute(q)) as Promise<T>;

  beforeEach(async () => {
    db = await freshDb();
    const signUp = async (authId: string, email: string) => {
      await db.execute(sql`insert into auth.users (id, email, last_sign_in_at) values (${authId}, ${email}, now())`);
      return (await withUser(db, authId, (tx) => tx.insert(users).values({ authProviderId: authId, email }).returning()))[0]!.id;
    };
    ownerId = await signUp(OWNER, 'owner@example.com');
    helperId = await signUp(HELPER, 'helper@example.com');
    clientId = await signUp(CLIENT, 'client@example.com');
    await db.execute(sql`select public.grant_admin_role('owner@example.com', 'super_admin')`);
    await db.execute(sql`select public.grant_admin_role('HELPER@example.com', 'admin')`);
    await db.insert(assessments).values({ userId: clientId, version: 1, status: 'completed', completedAt: new Date() });
  });

  it('tells each user their own admin role, and nothing about anyone else', async () => {
    expect(rows(await as(OWNER, sql`select public.my_admin_role() as r`))[0]!.r).toBe('super_admin');
    expect(rows(await as(HELPER, sql`select public.my_admin_role() as r`))[0]!.r).toBe('admin');
    expect(rows(await as(CLIENT, sql`select public.my_admin_role() as r`))[0]!.r).toBeNull();
  });

  it('lists users with onboarding status but no personal health data, and logs the view', async () => {
    const list = rows(await as(HELPER, sql`select * from public.admin_list_users()`));
    expect(list.map((u) => u.email).sort()).toEqual(['client@example.com', 'helper@example.com', 'owner@example.com']);
    const client = list.find((u) => u.email === 'client@example.com')!;
    expect(client).toMatchObject({ status: 'active', admin_role: null, onboarding: 'completed', checkins: 0 });
    expect(client.last_sign_in_at).not.toBeNull();
    expect(list.find((u) => u.email === 'owner@example.com')).toMatchObject({ admin_role: 'super_admin', onboarding: 'not_started' });
    expect(Object.keys(client).sort()).toEqual(
      ['admin_role', 'checkins', 'email', 'id', 'joined_at', 'last_checkin_at', 'last_sign_in_at', 'onboarding', 'status'].sort(),
    );
    const log = await db.select().from(auditLogs);
    expect(log.some((l) => l.action === 'admin.list_users' && l.actorId === helperId)).toBe(true);
  });

  it('refuses every admin function to non-admins and signed-out visitors', async () => {
    for (const q of [
      sql`select * from public.admin_list_users()`,
      sql`select public.admin_set_user_status(${ownerId}, 'suspended')`,
      sql`select public.admin_delete_user(${ownerId}, 'owner@example.com')`,
      sql`select * from public.admin_recent_actions()`,
    ]) {
      expect(await pgErrorCode(as(CLIENT, q))).toBe('42501');
      const anon = db.transaction(async (tx) => {
        await tx.execute(sql`set local role anon`);
        return tx.execute(q);
      });
      expect(await pgErrorCode(anon)).toBe('42501');
    }
  });

  it('nobody can grant themselves a role or read the roles table through the Data API', async () => {
    expect(await pgErrorCode(as(CLIENT, sql`select public.grant_admin_role('client@example.com', 'super_admin')`))).toBe('42501');
    expect(await pgErrorCode(withUser(db, CLIENT, (tx) => tx.insert(adminRoles).values({ userId: clientId, role: 'super_admin' })))).toBe('42501');
    expect(await withUser(db, OWNER, (tx) => tx.select().from(adminRoles))).toHaveLength(0);
  });

  it('suspending blocks sign-in and data access; reactivating restores both', async () => {
    await db.insert(bodyMeasurements).values({ userId: clientId, measuredAt: new Date(), type: 'weight', value: 70, unit: 'kg', source: 'measured_manual' });
    await as(HELPER, sql`select public.admin_set_user_status(${clientId}, 'suspended')`);

    const banned = rows(await db.execute(sql`select banned_until from auth.users where id = ${CLIENT}`))[0]!;
    expect(banned.banned_until).not.toBeNull();
    expect(await withUser(db, CLIENT, (tx) => tx.select().from(bodyMeasurements))).toHaveLength(0);
    // They can still see their own account row, so the app can explain.
    const own = await withUser(db, CLIENT, (tx) => tx.select().from(users));
    expect(own[0]!.status).toBe('suspended');
    // And cannot lift the suspension themselves.
    expect(await pgErrorCode(withUser(db, CLIENT, (tx) => tx.update(users).set({ status: 'active' })))).toBe('42501');

    await as(HELPER, sql`select public.admin_set_user_status(${clientId}, 'active')`);
    expect(rows(await db.execute(sql`select banned_until from auth.users where id = ${CLIENT}`))[0]!.banned_until).toBeNull();
    expect(await withUser(db, CLIENT, (tx) => tx.select().from(bodyMeasurements))).toHaveLength(1);

    const actions = rows(await as(OWNER, sql`select action, actor_email, subject_email from public.admin_recent_actions()`));
    expect(actions.slice(0, 2)).toEqual([
      { action: 'admin.reactivate_user', actor_email: 'helper@example.com', subject_email: 'client@example.com' },
      { action: 'admin.suspend_user', actor_email: 'helper@example.com', subject_email: 'client@example.com' },
    ]);
  });

  it('a suspended admin loses admin powers', async () => {
    await db.update(users).set({ status: 'suspended' }).where(sql`id = ${helperId}`);
    expect(await pgErrorCode(as(HELPER, sql`select * from public.admin_list_users()`))).toBe('42501');
  });

  it('admin accounts, including your own, cannot be suspended or deleted from the app', async () => {
    expect(await pgErrorCode(as(OWNER, sql`select public.admin_set_user_status(${helperId}, 'suspended')`))).toBe('42501');
    expect(await pgErrorCode(as(OWNER, sql`select public.admin_set_user_status(${ownerId}, 'suspended')`))).toBe('42501');
    expect(await pgErrorCode(as(OWNER, sql`select public.admin_delete_user(${helperId}, 'helper@example.com')`))).toBe('42501');
  });

  it('only a super admin can delete, with the email typed to confirm; all data goes, the audit entry stays', async () => {
    await db.insert(weeklyCheckins).values({
      userId: clientId, weekNo: 1, weekEnd: '2026-11-15', dueAt: new Date(), submittedAt: new Date(),
      dietAdherencePct: 90, daysLogged: 6, hunger: 3, energy: 3, sleepQuality: 3,
    });
    expect(await pgErrorCode(as(HELPER, sql`select public.admin_delete_user(${clientId}, 'client@example.com')`))).toBe('42501');
    expect(await pgErrorCode(as(OWNER, sql`select public.admin_delete_user(${clientId}, 'someone@example.com')`))).toBe('22023');

    await as(OWNER, sql`select public.admin_delete_user(${clientId}, ' Client@Example.com ')`);
    expect(await db.select().from(users).where(sql`id = ${clientId}`)).toHaveLength(0);
    expect(await db.select().from(weeklyCheckins)).toHaveLength(0);
    expect(await db.select().from(assessments)).toHaveLength(0);
    expect(rows(await db.execute(sql`select * from auth.users where id = ${CLIENT}`))).toHaveLength(0);
    const log = await db.select().from(auditLogs).where(sql`action = 'admin.delete_user'`);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ actorId: ownerId, subjectUserId: clientId });
  });

  it('new users always start active, whatever they send', async () => {
    const NEW = '44444444-4444-4444-8444-444444444444';
    const [u] = await withUser(db, NEW, (tx) => tx.insert(users).values({ authProviderId: NEW, email: 'n@example.com', status: 'suspended' }).returning());
    expect(u!.status).toBe('active');
  });
});

describe('supabase/update-1-admin.sql', () => {
  it('upgrades a project set up before the admin area, and Drizzle then sees nothing left to apply', async () => {
    const setup = readFileSync(new URL('../supabase/setup.sql', import.meta.url), 'utf8');
    const update = readFileSync(new URL('../supabase/update-1-admin.sql', import.meta.url), 'utf8');
    // The setup.sql projects ran before this change: everything up to 0004.
    const before = setup.slice(0, setup.indexOf('-- ===== 0005_admin_roles')) + setup.slice(setup.indexOf('-- ===== Access for signed-in users'));
    const client = new PGlite();
    await client.exec(SUPABASE_TEST_SHIM_SQL);
    await client.exec(before);
    await client.exec(update);
    // Later updates, in order, so Drizzle has nothing newer to apply.
    await client.exec(readFileSync(new URL('../supabase/update-2-workouts.sql', import.meta.url), 'utf8'));
    const count = async () => (await client.query<{ n: number }>('select count(*)::int as n from drizzle.__drizzle_migrations')).rows[0]!.n;
    const n = await count();
    await migrate(drizzle(client), { migrationsFolder });
    expect(await count()).toBe(n);
    const fn = await client.query(`select 1 from pg_proc where proname = 'admin_list_users'`);
    expect(fn.rows).toHaveLength(1);
  });
});
