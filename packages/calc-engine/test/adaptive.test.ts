import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  assessCheckin,
  macroCalories,
  policy,
  trendAt,
  trendWeights,
  type AdaptiveInput,
  type CheckinWeek,
  type WeighIn,
} from '../src/index.js';

const START = Date.parse('2026-09-01T00:00:00Z');
const day = (i: number) => new Date(START + i * 86_400_000).toISOString().slice(0, 10);

/** Daily weigh-ins changing by `kgPerWeek` (linear), for `weeks` weeks. */
function linear(startKg: number, kgPerWeek: number, weeks: number): WeighIn[] {
  return Array.from({ length: weeks * 7 + 1 }, (_, i) => ({ date: day(i), weightKg: startKg + (kgPerWeek * i) / 7 }));
}

function checkins(weeks: number, overrides: Partial<CheckinWeek> = {}): CheckinWeek[] {
  return Array.from({ length: weeks }, (_, w) => ({
    weekEnd: day((w + 1) * 7),
    dietAdherencePct: 90,
    daysLogged: 7,
    hunger: 2,
    energy: 4,
    sleepQuality: 4,
    ...overrides,
  }));
}

const current = { calories: 2410, proteinG: 160, carbsG: 292, fatG: 67 };

function input(over: Partial<AdaptiveInput>): AdaptiveInput {
  return {
    goal: 'fat_loss',
    sex: 'male',
    bmr: 1780,
    referenceWeightKg: 80,
    current,
    weighIns: linear(80, -0.4, 6),
    weeks: checkins(6),
    ...over,
  };
}

describe('trend weight', () => {
  it('a single high reading barely moves the trend', () => {
    const flat = linear(80, 0, 3);
    const spiked = [...flat.slice(0, -1), { date: flat.at(-1)!.date, weightKg: 81.5 }];
    const t = trendAt(trendWeights(spiked), flat.at(-1)!.date)!;
    expect(t - 80).toBeCloseTo(0.15, 6);
  });

  it('handles gaps between weigh-ins and same-day duplicates', () => {
    const t = trendWeights([
      { date: '2026-09-01', weightKg: 80 },
      { date: '2026-09-01', weightKg: 81 },
      { date: '2026-09-11', weightKg: 79.5 },
    ]);
    expect(t).toHaveLength(2);
    expect(t[0]!.weightKg).toBe(80.5);
    // 10-day gap: alpha = 1 − 0.9^10 ≈ 0.651
    expect(t[1]!.weightKg).toBeCloseTo(80.5 + (1 - 0.9 ** 10) * (79.5 - 80.5), 9);
  });
});

describe('weekly check-in decisions', () => {
  it('on track: losing 0.5%/week → no change', () => {
    const r = assessCheckin(input({}));
    expect(r.status).toBe('on_track');
    expect(r.decision).toBe('no_change');
    expect(r.weeklyRatePct).toBeCloseTo(-0.5, 1);
  });

  it('slower: losing ~0.19%/week → decrease, capped at 150 kcal, protein unchanged', () => {
    const r = assessCheckin(input({ weighIns: linear(80, -0.15, 6) }));
    expect(r.status).toBe('slower');
    expect(r.decision).toBe('decrease');
    expect(r.kcalChange).toBe(-150);
    expect(r.newTargets!.calories).toBe(2260);
    expect(r.newTargets!.proteinG).toBe(160);
    expect(Math.abs(macroCalories(r.newTargets!) - 2260)).toBeLessThanOrEqual(2);
  });

  it('plateau: flat trend for 3 weeks with good adherence → decrease', () => {
    const r = assessCheckin(input({ weighIns: linear(80, 0, 6) }));
    expect(r.status).toBe('plateau');
    expect(r.decision).toBe('decrease');
    expect(r.kcalChange).toBe(-150);
  });

  it('flat trend but only 2 good weeks is "slower", not plateau', () => {
    const weeks = checkins(6);
    weeks[3] = { ...weeks[3]!, dietAdherencePct: 50 };
    const r = assessCheckin(input({ weighIns: linear(80, 0, 6), weeks }));
    expect(r.status).toBe('slower');
  });

  it('faster: losing 1 kg/week → increase', () => {
    const r = assessCheckin(input({ weighIns: linear(80, -1, 6) }));
    expect(r.status).toBe('faster');
    expect(r.decision).toBe('increase');
    expect(r.kcalChange).toBe(150);
  });

  it('small gaps give small changes (min 50 kcal)', () => {
    const r = assessCheckin(
      input({ goal: 'lean_gain', weighIns: linear(80, 0.08, 6), current: { calories: 3130, proteinG: 144, carbsG: 455, fatG: 94 } }),
    );
    // 0.1%/week vs 0.25% target → slower; gap 0.15% × 80 × 1100 = 132 → 130 kcal
    expect(r.status).toBe('slower');
    expect(r.decision).toBe('increase');
    expect(r.kcalChange).toBeGreaterThanOrEqual(policy.adaptive.change.min);
    expect(r.kcalChange).toBeLessThan(150);
  });

  it('adherence gate: under 80% adherence → hold, no change', () => {
    const r = assessCheckin(input({ weighIns: linear(80, 0, 6), weeks: checkins(6, { dietAdherencePct: 60 }) }));
    expect(r.status).toBe('adherence_issue');
    expect(r.decision).toBe('hold_for_adherence');
    expect(r.newTargets).toBeNull();
  });

  it('adherence gate: fewer than 4 days logged → hold', () => {
    const r = assessCheckin(input({ weeks: checkins(6, { daysLogged: 3 }) }));
    expect(r.decision).toBe('hold_for_adherence');
  });

  it('recovery gate: 2 weeks of high hunger on fat loss → suggest diet break, no cut', () => {
    const r = assessCheckin(input({ weighIns: linear(80, 0, 6), weeks: checkins(6, { hunger: 5 }) }));
    expect(r.status).toBe('recovery_issue');
    expect(r.decision).toBe('suggest_diet_break');
    expect(r.kcalChange).toBe(0);
  });

  it('one bad week alone does not trigger the recovery gate', () => {
    const weeks = checkins(6);
    weeks[5] = { ...weeks[5]!, sleepQuality: 1 };
    expect(assessCheckin(input({ weeks })).status).not.toBe('recovery_issue');
  });

  it('never cuts below BMR', () => {
    const r = assessCheckin(input({ weighIns: linear(80, 0, 6), current: { calories: 1830, proteinG: 160, carbsG: 140, fatG: 51 } }));
    expect(r.decision).toBe('decrease');
    expect(r.newTargets!.calories).toBe(1780);
    expect(r.reasons.map((x) => x.code)).toContain('calorie_floor_applied');
  });

  it('already at the floor → at_floor, no change', () => {
    const r = assessCheckin(input({ weighIns: linear(80, 0, 6), current: { calories: 1780, proteinG: 160, carbsG: 137, fatG: 50 } }));
    expect(r.decision).toBe('at_floor');
    expect(r.newTargets).toBeNull();
  });

  it('screening forbids a deficit → never lowers calories', () => {
    const r = assessCheckin(input({ goal: 'maintenance', weighIns: linear(80, 0.6, 6), allowDeficit: false }));
    expect(r.status).toBe('drifting_up');
    expect(r.decision).toBe('no_change');
  });

  it('maintenance: stable weight → maintaining', () => {
    const r = assessCheckin(input({ goal: 'maintenance', weighIns: linear(80, 0.05, 6) }));
    expect(r.status).toBe('maintaining');
    expect(r.decision).toBe('no_change');
  });

  it('maintenance: creeping up → small decrease', () => {
    const r = assessCheckin(input({ goal: 'maintenance', weighIns: linear(80, 0.4, 6) }));
    expect(r.status).toBe('drifting_up');
    expect(r.decision).toBe('decrease');
  });

  it('missing weigh-ins → insufficient data, no change', () => {
    const r = assessCheckin(input({ weighIns: [{ date: day(42), weightKg: 80 }] }));
    expect(r.status).toBe('insufficient_data');
    expect(r.decision).toBe('no_change');
  });

  it('cycle-aware: uses a 4-week average, so one heavy week does not change targets', () => {
    // Steady 0.4 kg/week loss, then +1 kg water retention in the last week.
    const w = linear(80, -0.4, 6).map((x, i) => (i > 35 ? { ...x, weightKg: x.weightKg + 1 } : x));
    const plain = assessCheckin(input({ weighIns: w }));
    const aware = assessCheckin(input({ weighIns: w, cycleAware: true }));
    expect(aware.rateWindowWeeks).toBe(4);
    expect(plain.decision).toBe('decrease');
    expect(aware.decision).toBe('no_change');
  });

  it('observed TDEE: stable weight at 2,500 kcal intake ≈ 2,500', () => {
    const r = assessCheckin(input({ goal: 'maintenance', weighIns: linear(80, 0, 6), weeks: checkins(6, { avgIntakeKcal: 2500 }) }));
    expect(r.observedTdee).toBe(2500);
  });

  it('observed TDEE: losing 0.5 kg/week at 2,000 kcal ≈ 2,550', () => {
    const r = assessCheckin(input({ weighIns: linear(80, -0.5, 8), weeks: checkins(8, { avgIntakeKcal: 2000 }) }));
    // 0.5 kg × 7700 / 7 = 550 kcal/day; EMA lag shrinks the early trend slope slightly.
    expect(r.observedTdee).toBeGreaterThan(2450);
    expect(r.observedTdee).toBeLessThanOrEqual(2550);
  });

  it('observed TDEE needs 3 good weeks', () => {
    const r = assessCheckin(input({ weeks: checkins(2, { avgIntakeKcal: 2000 }) }));
    expect(r.observedTdee).toBeNull();
  });
});

describe('adaptive properties', () => {
  const arb = fc.record({
    goal: fc.constantFrom('fat_loss', 'recomposition', 'lean_gain', 'weight_gain', 'maintenance', 'strength', 'endurance' as const),
    sex: fc.constantFrom('male' as const, 'female' as const),
    startKg: fc.double({ min: 45, max: 180, noNaN: true }),
    kgPerWeek: fc.double({ min: -2, max: 2, noNaN: true }),
    noise: fc.array(fc.double({ min: -1, max: 1, noNaN: true }), { minLength: 43, maxLength: 43 }),
    adherence: fc.integer({ min: 0, max: 100 }),
    days: fc.integer({ min: 0, max: 7 }),
    hunger: fc.integer({ min: 1, max: 5 }),
    calories: fc.integer({ min: 1200, max: 4500 }),
    proteinPerKg: fc.double({ min: 1.2, max: 2.2, noNaN: true }),
    bmr: fc.integer({ min: 1000, max: 2400 }),
    cycleAware: fc.boolean(),
  });

  it('changes are bounded, protein is fixed, floors hold and macros add up', () => {
    fc.assert(
      fc.property(arb, (a) => {
        const weighIns = linear(a.startKg, a.kgPerWeek, 6).map((w, i) => ({ ...w, weightKg: w.weightKg + a.noise[i]! }));
        const ref = Math.min(a.startKg, 90);
        const proteinG = Math.round(a.proteinPerKg * ref);
        const fatG = Math.round((0.27 * a.calories) / 9);
        const carbsG = Math.max(0, Math.round((a.calories - proteinG * 4 - fatG * 9) / 4));
        const cur = { calories: a.calories, proteinG, carbsG, fatG };
        const r = assessCheckin({
          goal: a.goal,
          sex: a.sex,
          bmr: a.bmr,
          referenceWeightKg: ref,
          current: cur,
          weighIns,
          weeks: checkins(6, { dietAdherencePct: a.adherence, daysLogged: a.days, hunger: a.hunger }),
          cycleAware: a.cycleAware,
        });
        expect(Math.abs(r.kcalChange)).toBeLessThanOrEqual(policy.adaptive.change.max);
        if (r.newTargets) {
          expect(r.newTargets.proteinG).toBe(proteinG);
          expect(r.newTargets.carbsG).toBeGreaterThanOrEqual(0);
          expect(Math.abs(macroCalories(r.newTargets) - r.newTargets.calories)).toBeLessThanOrEqual(r.newTargets.calories * 0.01);
          if (r.kcalChange < 0) {
            expect(r.newTargets.calories).toBeGreaterThanOrEqual(Math.max(policy.safety.calorieFloor[a.sex], a.bmr));
          }
        }
        if (r.status === 'adherence_issue' || r.status === 'recovery_issue') expect(r.kcalChange).toBe(0);
        expect(assessCheckin({ goal: a.goal, sex: a.sex, bmr: a.bmr, referenceWeightKg: ref, current: cur, weighIns, weeks: checkins(6, { dietAdherencePct: a.adherence, daysLogged: a.days, hunger: a.hunger }), cycleAware: a.cycleAware })).toEqual(r);
      }),
      { numRuns: 3000 },
    );
    // 3,000 random cases take ~6 s on a busy CI runner, over Vitest's 5 s default.
  }, 30_000);
});
