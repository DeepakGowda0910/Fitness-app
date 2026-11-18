import type { LoggedSet, ProgramRequest } from '@fitness/workout-planner';
import type { AssessmentDraft } from './assessment';

export interface LoggedExercise {
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
}

/** One finished workout, as saved in this browser or the account. */
export interface StoredWorkout {
  id: string;
  /** YYYY-MM-DD, the user's local date. */
  date: string;
  dayKey: string;
  dayName: string;
  plannerVersion: string;
  durationMin?: number | undefined;
  /** 1 (easy) to 5 (all-out). */
  effort?: number | undefined;
  exercises: LoggedExercise[];
  notes?: string | undefined;
  completedAt: string;
}

/** The program request for these answers, or null when the user doesn't train yet. */
export function programRequestOf(d: AssessmentDraft): ProgramRequest | null {
  const days = d.trainingDaysPerWeek ?? 0;
  if (days < 1) return null;
  return {
    daysPerWeek: days,
    sessionMinutes: Math.min(240, Math.max(20, d.sessionMinutes ?? 45)),
    experience: d.experience ?? 'beginner',
    goal: d.goal ?? 'maintenance',
    equipment: d.equipment ?? 'gym',
    ...(d.split ? { split: d.split } : {}),
  };
}

/** Newest first: by date, then by when it was finished. */
export function sortWorkouts(ws: StoredWorkout[]): StoredWorkout[] {
  return [...ws].sort((a, b) => (a.date === b.date ? b.completedAt.localeCompare(a.completedAt) : b.date.localeCompare(a.date)));
}

/** The sets from the most recent workout that included this exercise. */
export function lastSetsFor(ws: StoredWorkout[], exerciseId: string): { date: string; sets: LoggedSet[] } | undefined {
  for (const w of sortWorkouts(ws)) {
    const e = w.exercises.find((x) => x.exerciseId === exerciseId && x.sets.length > 0);
    if (e) return { date: w.date, sets: e.sets };
  }
  return undefined;
}

/** Monday of the week containing `date` (YYYY-MM-DD). */
export function weekStart(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** Workouts done in the same Monday-to-Sunday week as `today`. */
export function workoutsThisWeek(ws: StoredWorkout[], today: string): number {
  const start = weekStart(today);
  return ws.filter((w) => w.date >= start && w.date <= today).length;
}

/** Total weight moved (kg × reps), a simple measure of how much work was done. */
export function volumeKg(w: StoredWorkout): number {
  let total = 0;
  for (const e of w.exercises) for (const s of e.sets) total += (s.weightKg ?? 0) * s.reps;
  return Math.round(total);
}

export function newWorkoutId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Older browsers: a random v4 UUID by hand.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
