/**
 * Builds a weekly strength program from the user's answers. Deterministic:
 * the same answers always give the same program, and every number comes
 * from the rules below, not from an AI.
 */
import { canUse, exerciseById, PREFERENCE, type Equipment, type Exercise, type Pattern } from './exercises.js';

export const WORKOUT_PLANNER_VERSION = '2026.11.1';

export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'fat_loss' | 'recomposition' | 'lean_gain' | 'weight_gain' | 'maintenance' | 'strength' | 'endurance';

export interface ProgramRequest {
  /** Training days a week the user chose, 1–7. */
  daysPerWeek: number;
  sessionMinutes: number;
  experience: Experience;
  goal: Goal;
  equipment: Equipment;
}

export type Unit = 'reps' | 'seconds' | 'minutes';

export interface PlannedExercise {
  exerciseId: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  unit: Unit;
  /** Reps or time count for each leg, arm or side. */
  perSide: boolean;
  restSec: number;
}

export interface ProgramDay {
  /** Stable id of the day type, e.g. `upper_a`. Logs refer to it. */
  key: string;
  name: string;
  focus: string;
  /** Suggested weekday, 0 = Monday. */
  weekday: number;
  exercises: PlannedExercise[];
  /** Estimated length including a 7-minute warm-up. */
  estMinutes: number;
}

export interface Program {
  version: string;
  splitName: string;
  daysPerWeek: number;
  days: ProgramDay[];
  /** Plain-language notes about choices made for this user. */
  notes: string[];
}

export class ProgramError extends Error {}

// ---------- Rep schemes ----------

interface Scheme {
  compound: [number, number];
  isolation: [number, number];
  compoundRest: number;
  isolationRest: number;
  label: string;
}

const SCHEMES: Record<'strength' | 'muscle' | 'general' | 'endurance', Scheme> = {
  strength: { compound: [4, 6], isolation: [8, 12], compoundRest: 180, isolationRest: 90, label: 'heavier sets of 4–6 on the main lifts' },
  muscle: { compound: [6, 10], isolation: [10, 15], compoundRest: 120, isolationRest: 75, label: 'sets of 6–15 to build muscle' },
  general: { compound: [8, 12], isolation: [12, 15], compoundRest: 90, isolationRest: 60, label: 'sets of 8–15 to keep muscle while you change your body' },
  endurance: { compound: [12, 15], isolation: [15, 20], compoundRest: 60, isolationRest: 45, label: 'lighter sets of 12–20 with short rests, plus conditioning' },
};

function schemeOf(goal: Goal): Scheme {
  switch (goal) {
    case 'strength':
      return SCHEMES.strength;
    case 'lean_gain':
    case 'weight_gain':
    case 'recomposition':
      return SCHEMES.muscle;
    case 'endurance':
      return SCHEMES.endurance;
    default:
      return SCHEMES.general;
  }
}

// ---------- Day templates ----------

type Slot = [Pattern, number];

interface Template {
  key: string;
  name: string;
  focus: string;
  slots: Slot[];
}

const T: Record<string, Template> = {
  fb_a: { key: 'fb_a', name: 'Full body A', focus: 'Squat, push, pull', slots: [['squat', 0], ['h_push', 0], ['h_pull', 0], ['lunge', 0], ['shoulders', 0], ['core', 0], ['biceps', 0], ['calves', 0]] },
  fb_b: { key: 'fb_b', name: 'Full body B', focus: 'Hinge, press, pull-down', slots: [['hinge', 0], ['v_push', 0], ['v_pull', 0], ['squat', 1], ['h_push', 1], ['core', 1], ['triceps', 0], ['shoulders', 1]] },
  fb_c: { key: 'fb_c', name: 'Full body C', focus: 'Single leg, incline, row', slots: [['lunge', 1], ['h_push', 2], ['h_pull', 1], ['hinge', 1], ['v_push', 1], ['core', 2], ['biceps', 1], ['triceps', 1]] },
  upper_a: { key: 'upper_a', name: 'Upper A', focus: 'Chest, back, shoulders, arms', slots: [['h_push', 0], ['h_pull', 0], ['v_push', 0], ['v_pull', 0], ['shoulders', 0], ['biceps', 0], ['triceps', 0]] },
  upper_b: { key: 'upper_b', name: 'Upper B', focus: 'Back, chest, shoulders, arms', slots: [['h_pull', 1], ['h_push', 1], ['v_pull', 0], ['v_push', 1], ['shoulders', 1], ['triceps', 1], ['biceps', 1]] },
  lower_a: { key: 'lower_a', name: 'Lower A', focus: 'Quads, glutes, core', slots: [['squat', 0], ['hinge', 0], ['lunge', 0], ['calves', 0], ['core', 0]] },
  lower_b: { key: 'lower_b', name: 'Lower B', focus: 'Glutes, hamstrings, core', slots: [['hinge', 1], ['squat', 1], ['lunge', 1], ['calves', 0], ['core', 1]] },
  push_a: { key: 'push_a', name: 'Push', focus: 'Chest, shoulders, triceps', slots: [['h_push', 0], ['v_push', 0], ['h_push', 1], ['shoulders', 0], ['triceps', 0], ['triceps', 1]] },
  pull_a: { key: 'pull_a', name: 'Pull', focus: 'Back, rear shoulders, biceps', slots: [['v_pull', 0], ['h_pull', 0], ['h_pull', 1], ['shoulders', 1], ['biceps', 0], ['biceps', 1]] },
  legs_a: { key: 'legs_a', name: 'Legs', focus: 'Quads, glutes, hamstrings', slots: [['squat', 0], ['hinge', 0], ['lunge', 0], ['calves', 0], ['core', 0]] },
  push_b: { key: 'push_b', name: 'Push B', focus: 'Shoulders, chest, triceps', slots: [['v_push', 0], ['h_push', 1], ['h_push', 2], ['shoulders', 0], ['triceps', 1], ['triceps', 0]] },
  pull_b: { key: 'pull_b', name: 'Pull B', focus: 'Back, rear shoulders, biceps', slots: [['h_pull', 1], ['v_pull', 1], ['h_pull', 0], ['shoulders', 2], ['biceps', 1], ['biceps', 2]] },
  legs_b: { key: 'legs_b', name: 'Legs B', focus: 'Hamstrings, glutes, quads', slots: [['hinge', 1], ['squat', 1], ['lunge', 1], ['calves', 0], ['core', 1]] },
};

interface Split {
  name: string;
  days: Template[];
}

function splitFor(days: number, experience: Experience): Split {
  switch (days) {
    case 1:
      return { name: 'Full body, once a week', days: [T.fb_a!] };
    case 2:
      return { name: 'Full body, twice a week', days: [T.fb_a!, T.fb_b!] };
    case 3:
      return experience === 'advanced'
        ? { name: 'Push, pull, legs', days: [T.push_a!, T.pull_a!, T.legs_a!] }
        : { name: 'Full body, three times a week', days: [T.fb_a!, T.fb_b!, T.fb_c!] };
    case 4:
      return { name: 'Upper and lower, twice each', days: [T.upper_a!, T.lower_a!, T.upper_b!, T.lower_b!] };
    case 5:
      return { name: 'Upper, lower, push, pull, legs', days: [T.upper_a!, T.lower_a!, T.push_a!, T.pull_a!, T.legs_b!] };
    default:
      return { name: 'Push, pull, legs, twice a week', days: [T.push_a!, T.pull_a!, T.legs_a!, T.push_b!, T.pull_b!, T.legs_b!] };
  }
}

/** Training days spread across the week (0 = Monday) so muscles get rest in between. */
export const WEEKDAYS_FOR: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

// ---------- Building ----------

const WARM_UP_MIN = 7;
const SECONDS_PER_REP_SET = 40;
const SETUP_SEC = 60;
const MIN_EXERCISES = 3;

function perSideOf(e: Exercise): boolean {
  return e.cues.some((c) => /per (leg|arm|side)/i.test(c));
}

function pick(pattern: Pattern, variant: number, req: ProgramRequest, used: Set<string>): Exercise | undefined {
  const options = PREFERENCE[pattern]
    .map((id) => exerciseById(id)!)
    .filter((e) => canUse(e, req.equipment) && (req.experience !== 'beginner' || e.level === 'beginner'));
  // With equipment, use it: bodyweight versions are only a fallback (core and calves excepted).
  const preferred =
    req.equipment === 'bodyweight' || pattern === 'core' || pattern === 'calves'
      ? options
      : options.filter((e) => e.needs !== 'bodyweight');
  const pool = preferred.length > 0 ? preferred : options;
  if (pool.length === 0) return undefined;
  for (let i = 0; i < pool.length; i++) {
    const e = pool[(variant + i) % pool.length]!;
    if (!used.has(e.id)) return e;
  }
  return undefined;
}

function prescribe(e: Exercise, req: ProgramRequest, scheme: Scheme): PlannedExercise {
  const base = { exerciseId: e.id, name: e.name, perSide: perSideOf(e) };
  if (e.pattern === 'conditioning') {
    const minutes: [number, number] = req.experience === 'beginner' ? [8, 12] : [12, 20];
    return { ...base, sets: 1, repsMin: minutes[0], repsMax: minutes[1], unit: 'minutes', restSec: 0 };
  }
  if (e.timed) {
    const secs: [number, number] = req.experience === 'beginner' ? [20, 40] : [30, 60];
    return { ...base, sets: req.experience === 'advanced' ? 3 : 2, repsMin: secs[0], repsMax: secs[1], unit: 'seconds', restSec: 45 };
  }
  const compound = e.kind === 'compound';
  let [lo, hi] = compound ? scheme.compound : scheme.isolation;
  // Beginners learn the movement with a few more reps and a little less weight.
  if (req.experience === 'beginner' && compound && lo < 6) [lo, hi] = [6, 8];
  // Bodyweight moves have no weight to add, so they progress through reps.
  if (e.load === 'bodyweight' && hi < 12) [lo, hi] = [8, 15];
  const sets = compound ? (req.experience === 'advanced' ? 4 : 3) : req.experience === 'beginner' ? 2 : 3;
  return { ...base, sets, repsMin: lo, repsMax: hi, unit: 'reps', restSec: compound ? scheme.compoundRest : scheme.isolationRest };
}

export function minutesOf(p: PlannedExercise): number {
  if (p.unit === 'minutes') return p.repsMax;
  const work = p.unit === 'seconds' ? p.repsMax * (p.perSide ? 2 : 1) : SECONDS_PER_REP_SET * (p.perSide ? 1.7 : 1);
  return (p.sets * (work + p.restSec) + SETUP_SEC) / 60;
}

function buildDay(tpl: Template, weekday: number, req: ProgramRequest, scheme: Scheme): ProgramDay {
  const used = new Set<string>();
  const chosen: PlannedExercise[] = [];
  let minutes = WARM_UP_MIN;
  for (const [pattern, variant] of tpl.slots) {
    const e = pick(pattern, variant, req, used);
    if (!e) continue;
    const p = prescribe(e, req, scheme);
    const m = minutesOf(p);
    if (chosen.length >= MIN_EXERCISES && minutes + m > req.sessionMinutes) continue;
    used.add(e.id);
    chosen.push(p);
    minutes += m;
  }
  if (req.goal === 'endurance' || req.goal === 'fat_loss') {
    const e = pick('conditioning', 0, req, used);
    if (e) {
      const p = prescribe(e, req, scheme);
      // Shorten the finisher to whatever time is left, but never below 5 minutes.
      const left = Math.floor(req.sessionMinutes - minutes);
      if (left >= 5) {
        const fitted = { ...p, repsMin: Math.min(p.repsMin, left), repsMax: Math.min(p.repsMax, left) };
        chosen.push(fitted);
        minutes += fitted.repsMax;
      }
    }
  }
  return { key: tpl.key, name: tpl.name, focus: tpl.focus, weekday, exercises: chosen, estMinutes: Math.round(minutes) };
}

const EQUIPMENT_LABEL: Record<Equipment, string> = {
  gym: 'a gym',
  dumbbells: 'dumbbells at home',
  bodyweight: 'no equipment',
};

export function generateProgram(req: ProgramRequest): Program {
  if (!Number.isInteger(req.daysPerWeek) || req.daysPerWeek < 1 || req.daysPerWeek > 7) {
    throw new ProgramError('Choose between 1 and 7 training days a week.');
  }
  if (!(req.sessionMinutes >= 10 && req.sessionMinutes <= 240)) {
    throw new ProgramError('Session length must be between 10 and 240 minutes.');
  }
  const notes: string[] = [];
  let days = req.daysPerWeek;
  if (days === 7) {
    days = 6;
    notes.push('Strength training is planned on 6 days. Keep one full rest day each week; walking is fine.');
  }
  if (req.experience === 'beginner' && days > 4) {
    days = 4;
    notes.push(`As a beginner you get the most from 4 strength days. Use your other ${req.daysPerWeek - 4 === 1 ? 'day' : 'days'} for walking or light cardio.`);
  }
  const scheme = schemeOf(req.goal);
  const split = splitFor(days, req.experience);
  const weekdays = WEEKDAYS_FOR[days]!;
  const built = split.days.map((tpl, i) => buildDay(tpl, weekdays[i]!, req, scheme));

  notes.unshift(`Planned for ${EQUIPMENT_LABEL[req.equipment]}, with ${scheme.label}.`);
  if (built.some((d) => d.estMinutes > req.sessionMinutes + 2)) {
    notes.push(`Some days run past ${req.sessionMinutes} minutes. If you are short on time, do the first three exercises.`);
  }
  if (req.goal === 'fat_loss') notes.push('Lifting keeps your muscle while you lose fat. Your daily steps matter as much as these sessions.');

  return { version: WORKOUT_PLANNER_VERSION, splitName: split.name, daysPerWeek: days, days: built, notes };
}

/** The day to do next: the one after the most recently logged day of this program. */
export function nextDayIndex(program: Program, recentDayKeys: string[]): number {
  for (const key of recentDayKeys) {
    const i = program.days.findIndex((d) => d.key === key);
    if (i >= 0) return (i + 1) % program.days.length;
  }
  return 0;
}
