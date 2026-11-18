import { computeTargets } from '@fitness/calc-engine';
import { describe, expect, it } from 'vitest';
import { toTargetsInput, type AssessmentDraft } from '@/lib/assessment';
import { EPOCH } from '@/lib/backend';
import {
  activeDayTargets,
  activeTargets,
  newCheckin,
  nextCheckinDate,
  replay,
  withWeighIn,
  type StoredWeighIn,
  type TrackingData,
  type WeekAnswers,
} from '@/lib/checkins';

const draft: AssessmentDraft = {
  sex: 'male',
  ageYears: 30,
  heightCm: 175,
  weightKg: 85,
  occupation: 'sedentary',
  trainingDaysPerWeek: 3,
  sessionMinutes: 60,
  experience: 'beginner',
  goal: 'fat_loss',
  weeklyRatePct: 0.5,
  dietType: 'vegetarian',
  mealsPerDay: 4,
};
const base = computeTargets(toTargetsInput(draft));
const good: WeekAnswers = { daysLogged: 7, dietAdherencePct: 90, hunger: 3, energy: 3, sleepQuality: 4 };

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Daily weigh-ins, each recorded on its own morning. */
function weighIns(start: string, days: number, startKg: number, perDay: number): StoredWeighIn[] {
  let list: StoredWeighIn[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    list = withWeighIn(list, { date, weightKg: Math.round((startKg + perDay * i) * 10) / 10, recordedAt: `${date}T07:00:00.000Z` });
  }
  return list;
}

/** Submits a check-in on each date (in the evening), as the app would. */
function checkInOn(data: TrackingData, dates: string[], answers: WeekAnswers = good): TrackingData {
  let d = data;
  for (const date of dates) d = { ...d, checkins: [...d.checkins, newCheckin(d, answers, date, `${date}T20:00:00.000Z`, false)] };
  return d;
}

describe('withWeighIn', () => {
  it('keeps one per date, in order', () => {
    let list: StoredWeighIn[] = [];
    list = withWeighIn(list, { date: '2026-11-10', weightKg: 85, recordedAt: 'a' });
    list = withWeighIn(list, { date: '2026-11-08', weightKg: 85.4, recordedAt: 'b' });
    list = withWeighIn(list, { date: '2026-11-10', weightKg: 84.8, recordedAt: 'c' });
    expect(list.map((w) => [w.date, w.weightKg])).toEqual([
      ['2026-11-08', 85.4],
      ['2026-11-10', 84.8],
    ]);
  });
});

describe('replay', () => {
  it('holds targets when adherence was low', () => {
    let data: TrackingData = { since: EPOCH, weighIns: weighIns('2026-11-01', 15, 85, 0), checkins: [] };
    data = checkInOn(data, ['2026-11-08']);
    data = checkInOn(data, ['2026-11-15'], { ...good, dietAdherencePct: 50, daysLogged: 3 });
    const results = replay(base, data);
    expect(results.at(-1)!.assessment.decision).toBe('hold_for_adherence');
  });

  it('lowers calories when weight stalls, never below the floor, and never changes protein', () => {
    let data: TrackingData = { since: EPOCH, weighIns: weighIns('2026-10-25', 29, 85, 0), checkins: [] };
    data = checkInOn(data, ['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22']);
    const results = replay(base, data);
    expect(results.map((r) => r.assessment.decision)).toContain('decrease');
    const now = activeTargets(base, results);
    expect(now.calories).toBeLessThan(base.calories);
    expect(now.calories).toBeGreaterThanOrEqual(Math.max(1500, base.bmr.value));
    for (const r of results) expect(r.targetsAfter.proteinG).toBe(base.proteinG);
    expect(activeDayTargets(base, results).fibreG).toBe(Math.round((14 * now.calories) / 1000));
  });

  it('gives each check-in only the weigh-ins recorded before it, so backdated entries do not rewrite history', () => {
    let data: TrackingData = { since: EPOCH, weighIns: weighIns('2026-11-01', 15, 85, 0), checkins: [] };
    data = checkInOn(data, ['2026-11-15']);
    const before = replay(base, data)[0]!.assessment;
    // A week later the user backfills lower weights for the earlier days.
    const backfill = weighIns('2026-11-08', 7, 83, 0).map((w) => ({ ...w, recordedAt: '2026-11-20T07:00:00.000Z' }));
    const after = replay(base, { ...data, weighIns: backfill.reduce(withWeighIn, data.weighIns) })[0]!.assessment;
    expect(after).toEqual(before);
  });

  it('ignores check-ins made under earlier assessment answers', () => {
    let data: TrackingData = { since: EPOCH, weighIns: weighIns('2026-10-25', 15, 85, 0), checkins: [] };
    data = checkInOn(data, ['2026-11-01', '2026-11-08']);
    expect(replay(base, data)).toHaveLength(2);
    const edited = { ...data, since: '2026-11-09T10:00:00.000Z' };
    expect(replay(base, edited)).toHaveLength(0);
    expect(activeTargets(base, replay(base, edited)).calories).toBe(base.calories);
    expect(nextCheckinDate(edited, '2026-11-10')).toBeNull();
  });
});

describe('newCheckin', () => {
  it('allows one check-in a week', () => {
    let data: TrackingData = { since: EPOCH, weighIns: weighIns('2026-11-01', 8, 85, -0.05), checkins: [] };
    data = checkInOn(data, ['2026-11-08']);
    expect(nextCheckinDate(data, '2026-11-10')).toBe('2026-11-14');
    expect(() => newCheckin(data, good, '2026-11-10', '2026-11-10T20:00:00.000Z', false)).toThrow();
    expect(nextCheckinDate(data, '2026-11-14')).toBeNull();
  });
});
