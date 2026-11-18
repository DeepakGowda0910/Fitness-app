import { describe, expect, it } from 'vitest';
import {
  canUse,
  EXERCISES,
  exerciseById,
  generateProgram,
  nextDayIndex,
  PREFERENCE,
  ProgramError,
  suggestNext,
  type Equipment,
  type Experience,
  type Goal,
  type PlannedExercise,
  type ProgramRequest,
} from '../src/index.js';

const base: ProgramRequest = { daysPerWeek: 3, sessionMinutes: 60, experience: 'intermediate', goal: 'lean_gain', equipment: 'gym' };

const EQUIPMENT: Equipment[] = ['gym', 'dumbbells', 'bodyweight'];
const LEVELS: Experience[] = ['beginner', 'intermediate', 'advanced'];
const GOALS: Goal[] = ['fat_loss', 'recomposition', 'lean_gain', 'weight_gain', 'maintenance', 'strength', 'endurance'];

describe('exercise library', () => {
  it('has unique ids, and every preference entry exists', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    for (const ids of Object.values(PREFERENCE)) for (const id of ids) expect(exerciseById(id), id).toBeDefined();
  });

  it('every exercise has cues and is in its pattern list', () => {
    for (const e of EXERCISES) {
      expect(e.cues.length).toBeGreaterThan(0);
      expect(PREFERENCE[e.pattern]).toContain(e.id);
    }
  });
});

describe('generateProgram', () => {
  it('is deterministic', () => {
    expect(generateProgram(base)).toEqual(generateProgram(base));
  });

  it('gives one day per training day, on separate weekdays', () => {
    for (let days = 1; days <= 6; days++) {
      const p = generateProgram({ ...base, daysPerWeek: days });
      expect(p.days).toHaveLength(days);
      expect(new Set(p.days.map((d) => d.weekday)).size).toBe(days);
      expect(new Set(p.days.map((d) => d.key)).size).toBe(days);
    }
  });

  it('keeps one rest day for 7 days, and caps beginners at 4 strength days', () => {
    const seven = generateProgram({ ...base, daysPerWeek: 7 });
    expect(seven.days).toHaveLength(6);
    expect(seven.notes.join(' ')).toMatch(/rest day/);
    const beginner = generateProgram({ ...base, experience: 'beginner', daysPerWeek: 6 });
    expect(beginner.days).toHaveLength(4);
    expect(beginner.notes.join(' ')).toMatch(/4 strength days/);
  });

  it('only uses equipment the user has, and only beginner moves for beginners', () => {
    for (const equipment of EQUIPMENT)
      for (const experience of LEVELS)
        for (const goal of GOALS)
          for (let days = 1; days <= 6; days++) {
            const p = generateProgram({ daysPerWeek: days, sessionMinutes: 60, experience, goal, equipment });
            for (const d of p.days) {
              expect(d.exercises.length).toBeGreaterThanOrEqual(3);
              expect(new Set(d.exercises.map((e) => e.exerciseId)).size).toBe(d.exercises.length);
              for (const pe of d.exercises) {
                const e = exerciseById(pe.exerciseId)!;
                expect(canUse(e, equipment), `${e.id} with ${equipment}`).toBe(true);
                if (experience === 'beginner') expect(e.level).toBe('beginner');
                expect(pe.repsMin).toBeLessThanOrEqual(pe.repsMax);
                expect(pe.sets).toBeGreaterThan(0);
              }
            }
          }
  });

  it('fits more exercises into longer sessions', () => {
    const short = generateProgram({ ...base, sessionMinutes: 30 });
    const long = generateProgram({ ...base, sessionMinutes: 90 });
    const count = (p: typeof short) => p.days.reduce((n, d) => n + d.exercises.length, 0);
    expect(count(long)).toBeGreaterThan(count(short));
    for (const d of long.days) expect(d.estMinutes).toBeLessThanOrEqual(92);
  });

  it('uses heavier rep ranges for strength than for endurance', () => {
    const strength = generateProgram({ ...base, goal: 'strength' }).days[0]!.exercises[0]!;
    const endurance = generateProgram({ ...base, goal: 'endurance' }).days[0]!.exercises[0]!;
    expect(strength.repsMax).toBeLessThan(endurance.repsMin);
  });

  it('adds a conditioning finisher for endurance when time allows', () => {
    const p = generateProgram({ ...base, goal: 'endurance', sessionMinutes: 75 });
    expect(p.days.every((d) => d.exercises.some((e) => e.unit === 'minutes'))).toBe(true);
  });

  it('rejects impossible answers', () => {
    expect(() => generateProgram({ ...base, daysPerWeek: 0 })).toThrow(ProgramError);
    expect(() => generateProgram({ ...base, sessionMinutes: 5 })).toThrow(ProgramError);
  });
});

describe('nextDayIndex', () => {
  it('follows the most recent logged day, and starts at day 1', () => {
    const p = generateProgram({ ...base, daysPerWeek: 3 });
    expect(nextDayIndex(p, [])).toBe(0);
    expect(nextDayIndex(p, [p.days[0]!.key])).toBe(1);
    expect(nextDayIndex(p, [p.days[2]!.key, p.days[1]!.key])).toBe(0);
    expect(nextDayIndex(p, ['unknown', p.days[1]!.key])).toBe(2);
  });
});

describe('suggestNext', () => {
  const press: PlannedExercise = { exerciseId: 'bench_press', name: 'Bench', sets: 3, repsMin: 6, repsMax: 10, unit: 'reps', perSide: false, restSec: 120 };
  const squat: PlannedExercise = { ...press, exerciseId: 'back_squat', name: 'Squat' };

  it('asks for a starting weight the first time', () => {
    const s = suggestNext(press, undefined);
    expect(s.kind).toBe('start');
    expect(s.weightKg).toBeNull();
  });

  it('adds weight once every set reaches the top of the range', () => {
    const s = suggestNext(press, [
      { weightKg: 60, reps: 10 },
      { weightKg: 60, reps: 10 },
      { weightKg: 60, reps: 11 },
    ]);
    expect(s).toMatchObject({ kind: 'increase', weightKg: 62.5, targetReps: 6 });
    expect(suggestNext(squat, [{ weightKg: 80, reps: 10 }, { weightKg: 80, reps: 10 }, { weightKg: 80, reps: 10 }]).weightKg).toBe(85);
  });

  it('repeats the weight and asks for one more rep otherwise', () => {
    const s = suggestNext(press, [
      { weightKg: 60, reps: 10 },
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 7 },
    ]);
    expect(s).toMatchObject({ kind: 'repeat', weightKg: 60, targetReps: 10 });
    expect(suggestNext(press, [{ weightKg: 60, reps: 7 }, { weightKg: 60, reps: 7 }, { weightKg: 60, reps: 6 }]).targetReps).toBe(8);
  });

  it('drops the weight when reps fall below the range', () => {
    const s = suggestNext(press, [
      { weightKg: 60, reps: 4 },
      { weightKg: 60, reps: 3 },
    ]);
    expect(s.kind).toBe('decrease');
    expect(s.weightKg).toBe(52.5);
  });

  it('never suggests an increase when fewer sets than planned were done', () => {
    expect(suggestNext(press, [{ weightKg: 60, reps: 10 }]).kind).toBe('repeat');
  });
});
