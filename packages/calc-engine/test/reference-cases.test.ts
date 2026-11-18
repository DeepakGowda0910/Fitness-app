/**
 * Hand-checked reference cases. The arithmetic for each is written out in
 * docs/calc-engine.md so anyone can verify it without running code.
 */
import { describe, expect, it } from 'vitest';
import {
  assessFeasibility,
  computeActivityFactor,
  computeBmr,
  computeTargets,
  katchMcArdle,
  macroCalories,
  mifflinStJeor,
  screen,
} from '../src/index.js';

describe('Mifflin-St Jeor', () => {
  it('male 30 y, 180 cm, 80 kg = 1780 kcal', () => {
    expect(mifflinStJeor('male', 80, 180, 30)).toBe(1780);
  });
  it('female 45 y, 160 cm, 95 kg = 1564 kcal', () => {
    expect(mifflinStJeor('female', 95, 160, 45)).toBe(1564);
  });
});

describe('Katch-McArdle', () => {
  it('80 kg at 15% body fat = 370 + 21.6 × 68 = 1838.8 kcal', () => {
    expect(katchMcArdle(80, 15)).toBeCloseTo(1838.8, 6);
  });
  it('is only shown when body fat was measured', () => {
    const base = { sex: 'male' as const, weightKg: 80, heightCm: 180, ageYears: 30 };
    expect(computeBmr({ ...base, bodyFat: { percent: 15, source: 'measured_device' } }).katchMcArdle).toBe(1839);
    expect(computeBmr({ ...base, bodyFat: { percent: 15, source: 'user_estimate' } }).katchMcArdle).toBeUndefined();
  });
});

describe('activity factor', () => {
  it('8,000 steps + 4 × 60 min training = 1.375 + 0.12 = 1.495', () => {
    const r = computeActivityFactor({ occupation: 'sedentary', avgDailySteps: 8000, trainingDaysPerWeek: 4, sessionMinutes: 60 });
    expect(r.factor).toBe(1.495);
    expect(r.baseSource).toBe('steps');
  });
  it('falls back to occupation and records the assumption', () => {
    const r = computeActivityFactor({ occupation: 'light', trainingDaysPerWeek: 0 });
    expect(r.factor).toBe(1.3);
    expect(r.assumptions.map((a) => a.code)).toContain('activity_from_occupation');
  });
  it('a very active week (12,500+ steps, 6 × 60 min) stays well below the cap: 1.5 + 0.18 = 1.68', () => {
    // Policy 2026.11.2 gave 1.6 + 0.3 = 1.9 here, about 15% above typical calculators.
    const r = computeActivityFactor({ occupation: 'sedentary', avgDailySteps: 14000, trainingDaysPerWeek: 6, sessionMinutes: 60 });
    expect(r.factor).toBe(1.68);
  });
  it('steps alone never go above 1.5', () => {
    const r = computeActivityFactor({ occupation: 'sedentary', avgDailySteps: 30000, trainingDaysPerWeek: 0 });
    expect(r.factor).toBe(1.5);
  });
  it('is capped at 1.9', () => {
    const r = computeActivityFactor({ occupation: 'heavy', avgDailySteps: 20000, trainingDaysPerWeek: 7, sessionMinutes: 120 });
    expect(r.factor).toBe(1.9);
  });
});

describe('computeTargets: case A, male fat loss', () => {
  const t = computeTargets({
    sex: 'male',
    ageYears: 30,
    heightCm: 180,
    weightKg: 80,
    activity: { occupation: 'sedentary', avgDailySteps: 8000, trainingDaysPerWeek: 4, sessionMinutes: 60 },
    goal: 'fat_loss',
  });

  it('BMR 1780, TDEE 2661 (±10%)', () => {
    expect(t.bmr.value).toBe(1780);
    expect(t.tdee.value).toBe(2661);
    expect(t.tdee.range).toEqual({ min: 2395, max: 2927 });
  });
  it('0.5%/week deficit of 440 kcal → 2230 kcal', () => {
    expect(t.calories).toBe(2230);
    expect(t.dailyDeficitKcal).toBe(431);
  });
  it('macros P160 / F62 / C258, fibre 31 g, water 2800 ml', () => {
    expect(t.proteinG).toBe(160);
    expect(t.fatG).toBe(62);
    expect(t.carbsG).toBe(258);
    expect(t.fibreG).toBe(31);
    expect(t.water.baseMl).toBe(2800);
  });
  it('macros add up to the calorie target', () => {
    expect(Math.abs(macroCalories(t) - t.calories)).toBeLessThanOrEqual(2);
  });
  it('records engine and policy versions', () => {
    expect(t.engineVersion).toMatch(/^\d+\.\d+\.\d+\+policy\./);
    expect(t.screening.riskLevel).toBe('clear');
  });
});

describe('computeTargets: case B, female BMI 37, aggressive rate', () => {
  const t = computeTargets({
    sex: 'female',
    ageYears: 45,
    heightCm: 160,
    weightKg: 95,
    activity: { occupation: 'light', trainingDaysPerWeek: 0 },
    goal: 'fat_loss',
    weeklyRatePct: 0.75,
  });

  it('uses BMI-25 reference weight of 64 kg for protein', () => {
    expect(t.referenceWeightKg).toBe(64);
    expect(t.proteinG).toBe(128);
  });
  it('caps the deficit at 25% of TDEE, then never goes below BMR', () => {
    expect(t.bmr.value).toBe(1564);
    expect(t.tdee.value).toBe(2033);
    const codes = t.warnings.map((w) => w.code);
    expect(codes).toContain('deficit_capped');
    expect(codes).toContain('calorie_floor_applied');
    expect(t.calories).toBe(1570);
  });
  it('macros P128 / F44 / C166, fibre 22 g, water 3350 ml', () => {
    expect(t.fatG).toBe(44);
    expect(t.carbsG).toBe(166);
    expect(t.fibreG).toBe(22);
    expect(t.water.baseMl).toBe(3350);
  });
});

describe('safety screening', () => {
  it('pregnancy forces maintenance and a referral', () => {
    const t = computeTargets({
      sex: 'female',
      ageYears: 28,
      heightCm: 165,
      weightKg: 60,
      activity: { occupation: 'sedentary', trainingDaysPerWeek: 2 },
      goal: 'fat_loss',
      screening: { pregnant: true },
    });
    expect(t.screening.riskLevel).toBe('refer');
    expect(t.appliedGoal).toBe('maintenance');
    expect(t.calories).toBe(Math.round(t.tdee.value / 10) * 10);
    expect(t.warnings.map((w) => w.code)).toContain('goal_changed_for_safety');
  });

  it('underweight adult may still choose weight gain', () => {
    const t = computeTargets({
      sex: 'male',
      ageYears: 25,
      heightCm: 178,
      weightKg: 55,
      activity: { occupation: 'sedentary', trainingDaysPerWeek: 3 },
      goal: 'weight_gain',
    });
    expect(t.screening.flags).toContain('underweight');
    expect(t.appliedGoal).toBe('weight_gain');
    expect(t.calories).toBeGreaterThan(t.tdee.value);
  });

  it('underweight adult cannot choose fat loss', () => {
    const r = screen({ ageYears: 25, weightKg: 55, heightCm: 178 });
    expect(r.allowDeficit).toBe(false);
  });

  it('insulin-treated diabetes needs a doctor review but keeps the goal', () => {
    const r = screen({ ageYears: 50, weightKg: 90, heightCm: 175, conditions: ['diabetes_insulin'] });
    expect(r.riskLevel).toBe('caution');
    expect(r.requiresDoctorReview).toBe(true);
    expect(r.allowDeficit).toBe(true);
  });

  it('minors get refer and no deficit', () => {
    const r = screen({ ageYears: 16, weightKg: 70, heightCm: 170 });
    expect(r.riskLevel).toBe('refer');
    expect(r.allowDeficit).toBe(false);
  });
});

describe('calorie floors', () => {
  it('small older sedentary woman: no deficit possible below BMR/1200, falls back to maintenance', () => {
    const t = computeTargets({
      sex: 'female',
      ageYears: 70,
      heightCm: 150,
      weightKg: 50,
      activity: { occupation: 'sedentary', avgDailySteps: 2000, trainingDaysPerWeek: 0 },
      goal: 'fat_loss',
    });
    // BMR = 500 + 937.5 − 350 − 161 = 926.5 → 927; TDEE = 927 × 1.2 = 1112
    expect(t.bmr.value).toBe(927);
    expect(t.tdee.value).toBe(1112);
    expect(t.calories).toBe(1112);
    expect(t.warnings.map((w) => w.code)).toContain('deficit_not_possible');
  });
});

describe('input validation', () => {
  it('rejects impossible values', () => {
    expect(() =>
      computeTargets({
        sex: 'male',
        ageYears: 30,
        heightCm: 50,
        weightKg: 80,
        activity: { occupation: 'sedentary', trainingDaysPerWeek: 0 },
        goal: 'maintenance',
      }),
    ).toThrow();
  });
});

describe('goal feasibility', () => {
  it('80 → 72 kg in 16 weeks is realistic (0.625%/week)', () => {
    const r = assessFeasibility({
      goal: 'fat_loss',
      heightCm: 180,
      currentWeightKg: 80,
      targetWeightKg: 72,
      startDate: '2026-11-18',
      targetDate: '2027-03-10',
    });
    expect(r.weeks).toBe(16);
    expect(r.requiredWeeklyRatePct).toBe(0.63);
    expect(r.feasibility).toBe('realistic');
  });

  it('80 → 70 kg in 8 weeks is unsafe and suggests a date 25 weeks out', () => {
    const r = assessFeasibility({
      goal: 'fat_loss',
      heightCm: 180,
      currentWeightKg: 80,
      targetWeightKg: 70,
      startDate: '2026-11-18',
      targetDate: '2027-01-13',
    });
    expect(r.feasibility).toBe('unsafe');
    expect(r.suggestedTargetDate).toBe('2027-05-12');
  });

  it('a target below BMI 18.5 is unsafe', () => {
    const r = assessFeasibility({
      goal: 'fat_loss',
      heightCm: 180,
      currentWeightKg: 70,
      targetWeightKg: 55,
      startDate: '2026-11-18',
      targetDate: '2027-11-18',
    });
    expect(r.feasibility).toBe('unsafe');
    expect(r.warnings.map((w) => w.code)).toContain('target_underweight');
  });
});
