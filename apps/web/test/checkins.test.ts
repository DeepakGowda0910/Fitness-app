import { computeTargets } from '@fitness/calc-engine';
import { describe, expect, it } from 'vitest';
import { toTargetsInput, type AssessmentDraft } from '@/lib/assessment';
import {
  activeDayTargets,
  activeTargets,
  addWeighIn,
  emptyState,
  baseKeyOf,
  nextCheckinDate,
  removeWeighIn,
  runCheckin,
  stateFor,
  type CheckinState,
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

/** Daily weigh-ins from a start date, changing by `perDay` kg. */
function weighInsFrom(state: CheckinState, start: string, days: number, startKg: number, perDay: number): CheckinState {
  let s = state;
  for (let i = 0; i < days; i++) {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    s = addWeighIn(s, { date: d.toISOString().slice(0, 10), weightKg: Math.round((startKg + perDay * i) * 10) / 10 });
  }
  return s;
}

describe('weigh-ins', () => {
  it('keeps one per date, in order, and can remove one', () => {
    let s = emptyState('k');
    s = addWeighIn(s, { date: '2026-11-10', weightKg: 85 });
    s = addWeighIn(s, { date: '2026-11-08', weightKg: 85.4 });
    s = addWeighIn(s, { date: '2026-11-10', weightKg: 84.8 });
    expect(s.weighIns).toEqual([
      { date: '2026-11-08', weightKg: 85.4 },
      { date: '2026-11-10', weightKg: 84.8 },
    ]);
    expect(removeWeighIn(s, '2026-11-08').weighIns).toHaveLength(1);
  });
});

describe('runCheckin', () => {
  it('holds targets when weight is flat but adherence was low', () => {
    let s = weighInsFrom(emptyState(baseKeyOf(base)), '2026-11-01', 15, 85, 0);
    s = runCheckin(s, base, good, '2026-11-08').state;
    const { assessment } = runCheckin(s, base, { ...good, dietAdherencePct: 50, daysLogged: 3 }, '2026-11-15');
    expect(assessment.decision).toBe('hold_for_adherence');
    expect(assessment.newTargets).toBeNull();
  });

  it('lowers calories when weight stalls with good adherence, never below the floor, and never changes protein', () => {
    let s = weighInsFrom(emptyState(baseKeyOf(base)), '2026-10-25', 29, 85, 0);
    for (const d of ['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22']) s = runCheckin(s, base, good, d).state;
    const decisions = s.results.map((r) => r.assessment.decision);
    expect(decisions).toContain('decrease');
    const now = activeTargets(base, s);
    expect(now.calories).toBeLessThan(base.calories);
    expect(now.calories).toBeGreaterThanOrEqual(Math.max(1500, base.bmr.value));
    for (const r of s.results) expect(r.targetsAfter.proteinG).toBe(base.proteinG);
    const day = activeDayTargets(base, s);
    expect(day.fibreG).toBe(Math.round((14 * now.calories) / 1000));
  });

  it('allows one check-in a week', () => {
    let s = weighInsFrom(emptyState(baseKeyOf(base)), '2026-11-01', 8, 85, -0.05);
    s = runCheckin(s, base, good, '2026-11-08').state;
    expect(nextCheckinDate(s, '2026-11-10')).toBe('2026-11-14');
    expect(() => runCheckin(s, base, good, '2026-11-10')).toThrow();
    expect(nextCheckinDate(s, '2026-11-14')).toBeNull();
  });
});

describe('stateFor', () => {
  it('starts fresh when the assessment changes', () => {
    const s = addWeighIn(emptyState(baseKeyOf(base)), { date: '2026-11-01', weightKg: 85 });
    expect(stateFor(s, base).weighIns).toHaveLength(1);
    const other = computeTargets(toTargetsInput({ ...draft, weightKg: 90 }));
    expect(stateFor(s, other).weighIns).toHaveLength(0);
    expect(stateFor(null, base).results).toEqual([]);
  });
});
