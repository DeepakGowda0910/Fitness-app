import { computeTargets } from '@fitness/calc-engine';
import { describe, expect, it } from 'vitest';
import { firstIncompleteStep, normalise, toTargetsInput, validateStep, type AssessmentDraft } from '@/lib/assessment';

const complete: AssessmentDraft = {
  sex: 'female',
  ageYears: 28,
  heightCm: 160,
  weightKg: 65,
  occupation: 'sedentary',
  avgDailySteps: 6000,
  trainingDaysPerWeek: 3,
  sessionMinutes: 45,
  experience: 'beginner',
  goal: 'fat_loss',
  weeklyRatePct: 0.5,
  conditions: [],
  dietType: 'vegetarian',
  allergies: [],
  mealsPerDay: 4,
};

describe('validateStep', () => {
  it('accepts a complete draft on every step', () => {
    for (const step of ['body', 'activity', 'goal', 'health', 'food', 'review'] as const) {
      expect(validateStep(step, complete)).toEqual({});
    }
  });

  it('asks for the basics on an empty draft', () => {
    expect(Object.keys(validateStep('body', {})).sort()).toEqual(['ageYears', 'heightCm', 'sex', 'weightKg']);
  });

  it('rejects values outside the engine limits', () => {
    const e = validateStep('body', { ...complete, heightCm: 90, weightKg: 400, ageYears: 12 });
    expect(e.heightCm).toMatch(/between 120 and 230/);
    expect(e.weightKg).toMatch(/between 30 and 300/);
    expect(e.ageYears).toMatch(/between 13 and 100/);
  });

  it('needs body fat and its source only when the user says they know it', () => {
    expect(validateStep('body', { ...complete, knowsBodyFat: true })).toHaveProperty('bodyFatPct');
    expect(validateStep('body', { ...complete, knowsBodyFat: true, bodyFatPct: 28 })).toHaveProperty('bodyFatSource');
    expect(validateStep('body', { ...complete, knowsBodyFat: true, bodyFatPct: 28, bodyFatSource: 'professional' })).toEqual({});
  });

  it('needs session length only when the user trains', () => {
    expect(validateStep('activity', { ...complete, sessionMinutes: undefined })).toHaveProperty('sessionMinutes');
    expect(validateStep('activity', { ...complete, trainingDaysPerWeek: 0, sessionMinutes: undefined })).toEqual({});
  });

  it('needs a pace only for fat loss', () => {
    expect(validateStep('goal', { ...complete, weeklyRatePct: undefined })).toHaveProperty('weeklyRatePct');
    expect(validateStep('goal', { ...complete, goal: 'lean_gain', weeklyRatePct: undefined })).toEqual({});
  });
});

describe('firstIncompleteStep', () => {
  it('starts at the beginning, resumes mid-way, and ends at review', () => {
    expect(firstIncompleteStep({})).toBe('body');
    expect(firstIncompleteStep({ ...complete, goal: undefined })).toBe('goal');
    expect(firstIncompleteStep(complete)).toBe('review');
  });
});

describe('normalise', () => {
  it('drops answers that no longer apply', () => {
    const d = normalise({ ...complete, sex: 'male', pregnant: true, goal: 'maintenance', trainingDaysPerWeek: 0 });
    expect(d.pregnant).toBeUndefined();
    expect(d.weeklyRatePct).toBeUndefined();
    expect(d.sessionMinutes).toBeUndefined();
  });
});

describe('toTargetsInput', () => {
  it('produces input the engine accepts, and the same targets every time', () => {
    const a = computeTargets(toTargetsInput(complete));
    const b = computeTargets(toTargetsInput(complete));
    expect(a).toEqual(b);
    expect(a.inputs.activity.avgDailySteps).toBe(6000);
    expect(a.inputs.weeklyRatePct).toBe(0.5);
    expect(a.calories).toBeGreaterThan(1200);
  });

  it('passes measured body fat through, and leaves it out otherwise', () => {
    const withBf = toTargetsInput({ ...complete, knowsBodyFat: true, bodyFatPct: 30, bodyFatSource: 'professional' });
    expect(withBf.bodyFat).toEqual({ percent: 30, source: 'professional' });
    expect(toTargetsInput({ ...complete, bodyFatPct: 30 }).bodyFat).toBeUndefined();
  });

  it('carries safety answers, so pregnancy blocks a deficit', () => {
    const t = computeTargets(toTargetsInput({ ...complete, pregnant: true }));
    expect(t.screening.allowDeficit).toBe(false);
    expect(t.dailyDeficitKcal).toBeLessThanOrEqual(0);
  });

  it('never sends pregnancy answers for a male profile', () => {
    const input = toTargetsInput({ ...complete, sex: 'male', pregnant: true });
    expect(input.screening?.pregnant).toBe(false);
  });
});
