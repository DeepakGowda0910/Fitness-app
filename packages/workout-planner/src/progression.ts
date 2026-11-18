/**
 * Double progression: stay at a weight until every set reaches the top of the
 * rep range, then add the smallest sensible amount of weight.
 */
import { exerciseById } from './exercises.js';
import type { PlannedExercise } from './program.js';

export interface LoggedSet {
  /** Weight lifted in kg; 0 or null for bodyweight. */
  weightKg: number | null;
  /** Reps, or seconds/minutes for timed exercises. */
  reps: number;
}

export type SuggestionKind = 'start' | 'increase' | 'repeat' | 'decrease';

export interface Suggestion {
  kind: SuggestionKind;
  /** Weight to use, or null when there is none to suggest (bodyweight, first time). */
  weightKg: number | null;
  /** What to aim for on each set. */
  targetReps: number;
  note: string;
}

/** Smallest weight jump for each kind of exercise. */
export function incrementKg(exerciseId: string): number {
  const e = exerciseById(exerciseId);
  if (!e) return 2.5;
  if (e.load === 'dumbbell') return 2;
  if (e.body === 'lower' && e.kind === 'compound' && (e.load === 'barbell' || e.load === 'machine')) return 5;
  return 2.5;
}

const roundTo = (x: number, step: number) => Math.round(x / step) * step;

/**
 * What to do this time, given the sets logged last time for this exercise.
 * Pure: the same history always gives the same suggestion.
 */
export function suggestNext(planned: PlannedExercise, lastSets: LoggedSet[] | undefined): Suggestion {
  const unitWord = planned.unit === 'reps' ? 'reps' : planned.unit === 'seconds' ? 'seconds' : 'minutes';
  const sets = (lastSets ?? []).filter((s) => s.reps > 0);
  if (sets.length === 0) {
    if (planned.unit !== 'reps') {
      return { kind: 'start', weightKg: null, targetReps: planned.repsMin, note: `Start with ${planned.repsMin} ${unitWord} and build up.` };
    }
    const e = exerciseById(planned.exerciseId);
    const note =
      e?.load === 'bodyweight'
        ? `Do as many good reps as you can, up to ${planned.repsMax}.`
        : `Pick a weight you can lift ${planned.repsMax} times with about 2 reps to spare.`;
    return { kind: 'start', weightKg: null, targetReps: planned.repsMax, note };
  }

  const weights = sets.map((s) => s.weightKg ?? 0);
  const top = Math.max(...weights);
  const atTop = sets.filter((s) => (s.weightKg ?? 0) === top);
  const allHitMax = atTop.length >= planned.sets && atTop.every((s) => s.reps >= planned.repsMax);
  const best = Math.max(...atTop.map((s) => s.reps));
  const weight = top > 0 ? top : null;

  if (allHitMax) {
    if (planned.unit !== 'reps') {
      return { kind: 'increase', weightKg: weight, targetReps: planned.repsMax, note: `You reached ${planned.repsMax} ${unitWord} on every set. Make it harder: slower, or a tougher version.` };
    }
    if (weight === null) {
      return { kind: 'increase', weightKg: null, targetReps: planned.repsMax, note: 'Every set hit the top. Slow the lowering to 3 seconds, or hold a weight.' };
    }
    const next = roundTo(weight + incrementKg(planned.exerciseId), 0.5);
    return { kind: 'increase', weightKg: next, targetReps: planned.repsMin, note: `Every set hit ${planned.repsMax}. Go up to ${next} kg and aim for ${planned.repsMin}+ reps.` };
  }

  if (planned.unit === 'reps' && weight !== null && best < planned.repsMin) {
    const step = incrementKg(planned.exerciseId);
    const next = Math.max(step, Math.floor((weight * 0.9) / step) * step);
    if (next < weight) {
      return { kind: 'decrease', weightKg: next, targetReps: planned.repsMin, note: `Last time was below ${planned.repsMin} reps. Drop to ${next} kg and own the range.` };
    }
  }

  const target = Math.min(planned.repsMax, Math.max(planned.repsMin, best + 1));
  return {
    kind: 'repeat',
    weightKg: weight,
    targetReps: target,
    note: weight !== null ? `Stay at ${weight} kg and aim for ${target} ${unitWord} on each set.` : `Aim for ${target} ${unitWord} on each set.`,
  };
}
