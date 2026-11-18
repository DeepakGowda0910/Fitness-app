/**
 * Property tests: the safety and consistency rules must hold for every valid
 * profile, not just the hand-checked ones.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeTargets, macroCalories, policy, type TargetsInput } from '../src/index.js';

const goals = ['fat_loss', 'recomposition', 'lean_gain', 'weight_gain', 'maintenance', 'strength', 'endurance'] as const;

const profile: fc.Arbitrary<TargetsInput> = fc.record(
  {
    sex: fc.constantFrom('male' as const, 'female' as const),
    ageYears: fc.integer({ min: 13, max: 100 }),
    heightCm: fc.integer({ min: 120, max: 230 }),
    weightKg: fc.double({ min: 30, max: 300, noNaN: true }),
    activity: fc.record(
      {
        occupation: fc.constantFrom('sedentary' as const, 'light' as const, 'moderate' as const, 'heavy' as const),
        avgDailySteps: fc.integer({ min: 0, max: 60000 }),
        trainingDaysPerWeek: fc.integer({ min: 0, max: 7 }),
        sessionMinutes: fc.integer({ min: 10, max: 240 }),
      },
      { requiredKeys: ['occupation', 'trainingDaysPerWeek'] },
    ),
    goal: fc.constantFrom(...goals),
    experience: fc.constantFrom('beginner' as const, 'intermediate' as const, 'advanced' as const),
    weeklyRatePct: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
    screening: fc.record(
      {
        pregnant: fc.boolean(),
        breastfeeding: fc.boolean(),
        eatingDisorderHistory: fc.boolean(),
        weightAffectingMedication: fc.boolean(),
      },
      { requiredKeys: [] },
    ),
  },
  { requiredKeys: ['sex', 'ageYears', 'heightCm', 'weightKg', 'activity', 'goal'] },
);

const RUNS = 5000;

describe('calc engine properties', () => {
  it('macros always add up to calories within 1%', () => {
    fc.assert(
      fc.property(profile, (p) => {
        const t = computeTargets(p);
        expect(Math.abs(macroCalories(t) - t.calories)).toBeLessThanOrEqual(t.calories * 0.01);
      }),
      { numRuns: RUNS },
    );
  });

  it('no macro is negative and fat is at least 20% of calories', () => {
    fc.assert(
      fc.property(profile, (p) => {
        const t = computeTargets(p);
        expect(t.proteinG).toBeGreaterThanOrEqual(0);
        expect(t.carbsG).toBeGreaterThanOrEqual(0);
        expect(t.fatG * 9).toBeGreaterThanOrEqual(policy.macros.minFatPct * t.calories - 9);
      }),
      { numRuns: RUNS },
    );
  });

  it('a deficit never goes below BMR or the sex floor, and never exceeds 25% of TDEE', () => {
    fc.assert(
      fc.property(profile, (p) => {
        const t = computeTargets(p);
        // Maintenance targets are rounded to 10 kcal, so a gap of up to 5 kcal is rounding, not a deficit.
        if (t.dailyDeficitKcal > 5) {
          const floor = Math.max(policy.safety.calorieFloor[t.inputs.sex], t.bmr.value);
          expect(t.calories).toBeGreaterThanOrEqual(floor);
          // Allow for rounding the target up to the nearest 10 kcal.
          expect(t.dailyDeficitKcal).toBeLessThanOrEqual(t.tdee.value * policy.fatLoss.maxDeficitPctOfTdee + 10);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it('a "refer" screening never produces a deficit', () => {
    fc.assert(
      fc.property(profile, (p) => {
        const t = computeTargets(p);
        if (t.screening.riskLevel === 'refer') {
          expect(t.dailyDeficitKcal).toBeLessThanOrEqual(0);
          expect(['fat_loss', 'recomposition']).not.toContain(t.appliedGoal);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it('goals without a deficit never get one from rounding', () => {
    fc.assert(
      fc.property(profile, (p) => {
        const t = computeTargets(p);
        if (!['fat_loss', 'recomposition'].includes(t.appliedGoal)) expect(t.dailyDeficitKcal).toBeLessThanOrEqual(0);
      }),
      { numRuns: RUNS },
    );
  });

  it('activity factor stays within 1.2 to 2.2', () => {
    fc.assert(
      fc.property(profile, (p) => {
        const t = computeTargets(p);
        expect(t.tdee.activityFactor).toBeGreaterThanOrEqual(1.2);
        expect(t.tdee.activityFactor).toBeLessThanOrEqual(2.2);
      }),
      { numRuns: RUNS },
    );
  });

  it('is deterministic', () => {
    fc.assert(
      fc.property(profile, (p) => {
        expect(computeTargets(p)).toEqual(computeTargets(p));
      }),
      { numRuns: 500 },
    );
  });
});
