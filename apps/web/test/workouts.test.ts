import { describe, expect, it } from 'vitest';
import { lastSetsFor, programRequestOf, sortWorkouts, volumeKg, weekStart, workoutsThisWeek, type StoredWorkout } from '../lib/workouts';

const w = (id: string, date: string, completedAt: string, weightKg: number | null, reps: number[]): StoredWorkout => ({
  id,
  date,
  dayKey: 'fb_a',
  dayName: 'Full body A',
  plannerVersion: 'test',
  completedAt,
  exercises: [{ exerciseId: 'goblet_squat', name: 'Goblet squat', sets: reps.map((r) => ({ weightKg, reps: r })) }],
});

describe('programRequestOf', () => {
  it('is null for people who do not train, and fills sensible defaults', () => {
    expect(programRequestOf({ trainingDaysPerWeek: 0 })).toBeNull();
    expect(programRequestOf({})).toBeNull();
    expect(programRequestOf({ trainingDaysPerWeek: 3, sessionMinutes: 60, experience: 'advanced', goal: 'strength', equipment: 'dumbbells' })).toEqual({
      daysPerWeek: 3,
      sessionMinutes: 60,
      experience: 'advanced',
      goal: 'strength',
      equipment: 'dumbbells',
    });
    expect(programRequestOf({ trainingDaysPerWeek: 2 })).toMatchObject({ sessionMinutes: 45, experience: 'beginner', equipment: 'gym' });
  });
});

describe('workout history', () => {
  const history = [
    w('a', '2026-11-16', '2026-11-16T10:00:00Z', 16, [10, 10]),
    w('b', '2026-11-18', '2026-11-18T08:00:00Z', 18, [8, 8]),
    w('c', '2026-11-18', '2026-11-18T19:00:00Z', 20, [6]),
  ];

  it('sorts newest first and finds the latest sets for an exercise', () => {
    expect(sortWorkouts(history).map((x) => x.id)).toEqual(['c', 'b', 'a']);
    expect(lastSetsFor(history, 'goblet_squat')).toEqual({ date: '2026-11-18', sets: [{ weightKg: 20, reps: 6 }] });
    expect(lastSetsFor(history, 'bench_press')).toBeUndefined();
  });

  it('counts this Monday-to-Sunday week', () => {
    expect(weekStart('2026-11-18')).toBe('2026-11-16');
    expect(weekStart('2026-11-22')).toBe('2026-11-16');
    expect(workoutsThisWeek(history, '2026-11-18')).toBe(3);
    expect(workoutsThisWeek(history, '2026-11-23')).toBe(0);
  });

  it('adds up weight × reps', () => {
    expect(volumeKg(history[0]!)).toBe(320);
    expect(volumeKg(w('d', '2026-11-18', '2026-11-18T08:00:00Z', null, [12]))).toBe(0);
  });
});
