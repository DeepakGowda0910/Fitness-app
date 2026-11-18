import { randomUUID } from 'node:crypto';
import { DISHES } from '@fitness/meal-planner';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, tokenFor } from './helpers.js';

let app: INestApplication;
let http: ReturnType<INestApplication['getHttpServer']>;

beforeAll(async () => {
  app = await createTestApp();
  http = app.getHttpServer();
});
afterAll(async () => {
  await app.close();
});

const targetsBody = {
  sex: 'male',
  ageYears: 30,
  heightCm: 175,
  weightKg: 80,
  activity: { occupation: 'sedentary', avgDailySteps: 6000, trainingDaysPerWeek: 3, sessionMinutes: 60 },
  goal: 'fat_loss',
  weeklyRatePct: 0.5,
};

describe('health', () => {
  it('is public and reports engine versions', async () => {
    const res = await request(http).get('/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.engineVersion).toMatch(/\+policy\./);
  });
});

describe('sign-in check', () => {
  it('rejects a missing token', async () => {
    await request(http).post('/v1/targets/preview').send(targetsBody).expect(401);
  });

  it('rejects a token signed with another secret', async () => {
    const token = await tokenFor(undefined, { secret: 'some-other-secret-that-is-long-enough-000000' });
    await request(http).post('/v1/targets/preview').set('Authorization', `Bearer ${token}`).send(targetsBody).expect(401);
  });

  it('rejects a token for another audience', async () => {
    const token = await tokenFor(undefined, { audience: 'anon' });
    await request(http).post('/v1/targets/preview').set('Authorization', `Bearer ${token}`).send(targetsBody).expect(401);
  });

  it('rejects an expired token', async () => {
    const token = await tokenFor(undefined, { expiresIn: '-1m' });
    await request(http).post('/v1/targets/preview').set('Authorization', `Bearer ${token}`).send(targetsBody).expect(401);
  });

  it('rejects an unsigned token', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: randomUUID(), aud: 'authenticated' })).toString('base64url');
    await request(http).get('/v1/me').set('Authorization', `Bearer ${header}.${payload}.`).expect(401);
  });
});

describe('targets preview', () => {
  it('returns deterministic targets from the engine', async () => {
    const token = await tokenFor();
    const a = await request(http).post('/v1/targets/preview').set('Authorization', `Bearer ${token}`).send(targetsBody).expect(200);
    const b = await request(http).post('/v1/targets/preview').set('Authorization', `Bearer ${token}`).send(targetsBody).expect(200);
    expect(a.body).toEqual(b.body);
    expect(a.body.calories).toBeGreaterThan(1500);
    expect(a.body.calories).toBeLessThan(2600);
    expect(a.body.engineVersion).toMatch(/\+policy\./);
  });

  it('returns 400 with each problem for invalid input', async () => {
    const token = await tokenFor();
    const res = await request(http)
      .post('/v1/targets/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...targetsBody, heightCm: 50, goal: 'fly' })
      .expect(400);
    const paths = res.body.issues.map((i: { path: string }) => i.path);
    expect(paths).toEqual(expect.arrayContaining(['heightCm', 'goal']));
  });
});

describe('meal plan preview', () => {
  it('builds a 7-day vegetarian plan', async () => {
    const token = await tokenFor();
    const res = await request(http)
      .post('/v1/meal-plans/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targets: { calories: 2000, proteinG: 120, carbsG: 230, fatG: 65, fibreG: 28 },
        dietType: 'vegetarian',
        mealsPerDay: 4,
        startDate: '2026-11-23',
      })
      .expect(200);
    expect(res.body.days).toHaveLength(7);
    expect(res.body.days[6].date).toBe('2026-11-29');
  });

  it('returns 400 when no dish fits a meal', async () => {
    const token = await tokenFor();
    const breakfasts = DISHES.filter((d) => d.slots.includes('breakfast')).map((d) => d.id);
    const res = await request(http)
      .post('/v1/meal-plans/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targets: { calories: 2000, proteinG: 120, carbsG: 230, fatG: 65, fibreG: 28 },
        dietType: 'vegetarian',
        excludeDishIds: breakfasts,
        mealsPerDay: 3,
        startDate: '2026-11-23',
      })
      .expect(400);
    expect(res.body.code).toBe('no_dishes_for_slot');
  });
});

describe('check-in assessment', () => {
  it('holds calories when adherence is low', async () => {
    const token = await tokenFor();
    const weighIns = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-11-${String(i + 1).padStart(2, '0')}`,
      weightKg: 80,
    }));
    const week = { dietAdherencePct: 50, daysLogged: 3, hunger: 3, energy: 3, sleepQuality: 3 };
    const res = await request(http)
      .post('/v1/checkins/assess')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal: 'fat_loss',
        sex: 'male',
        bmr: 1750,
        referenceWeightKg: 80,
        current: { calories: 2100, proteinG: 150, carbsG: 220, fatG: 65 },
        weeklyRatePct: 0.5,
        weighIns,
        weeks: [
          { ...week, weekEnd: '2026-11-07' },
          { ...week, weekEnd: '2026-11-14' },
        ],
      })
      .expect(200);
    expect(res.body.decision).toBe('hold_for_adherence');
    expect(res.body.kcalChange).toBe(0);
  });
});

describe('me', () => {
  it('creates the account on first PUT and reads it back', async () => {
    const sub = randomUUID();
    const token = await tokenFor(sub, { email: 'first@example.com' });
    await request(http).get('/v1/me').set('Authorization', `Bearer ${token}`).expect(404);
    const created = await request(http).put('/v1/me').set('Authorization', `Bearer ${token}`).send({}).expect(200);
    expect(created.body).toMatchObject({ email: 'first@example.com', locale: 'en-IN', timezone: 'Asia/Kolkata' });
    const updated = await request(http)
      .put('/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ units: 'imperial' })
      .expect(200);
    expect(updated.body.id).toBe(created.body.id);
    expect(updated.body.units).toBe('imperial');
    const read = await request(http).get('/v1/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(read.body.units).toBe('imperial');
  });

  it("never shows one user another user's account", async () => {
    const alice = await tokenFor(randomUUID(), { email: 'alice@example.com' });
    const bob = await tokenFor(randomUUID(), { email: 'bob@example.com' });
    await request(http).put('/v1/me').set('Authorization', `Bearer ${alice}`).send({}).expect(200);
    await request(http).get('/v1/me').set('Authorization', `Bearer ${bob}`).expect(404);
  });

  it('rejects invalid settings', async () => {
    const token = await tokenFor();
    await request(http).put('/v1/me').set('Authorization', `Bearer ${token}`).send({ units: 'cubits' }).expect(400);
  });
});
