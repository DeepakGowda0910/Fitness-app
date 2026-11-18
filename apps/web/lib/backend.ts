import type { AssessmentDraft } from './assessment';
import type { StoredCheckin, StoredWeighIn, TrackingData } from './checkins';
import type { StoredWorkout } from './workouts';

export interface Snapshot {
  draft: AssessmentDraft;
  tracking: TrackingData;
  workouts: StoredWorkout[];
}

export const EPOCH = '1970-01-01T00:00:00.000Z';

export function emptySnapshot(): Snapshot {
  return { draft: {}, tracking: { since: EPOCH, weighIns: [], checkins: [] }, workouts: [] };
}

/** Where the user's data lives: this browser, or their Supabase account. */
export interface Backend {
  load(): Promise<Snapshot>;
  /** `since` is passed when the answers now give different targets, so earlier check-ins stop counting. */
  saveDraft(draft: AssessmentDraft, since: string | undefined): Promise<void>;
  putWeighIn(date: string, weightKg: number, recordedAt: string): Promise<StoredWeighIn>;
  deleteWeighIn(date: string): Promise<void>;
  addCheckin(checkin: StoredCheckin, weekNo: number): Promise<void>;
  addWorkout(w: StoredWorkout): Promise<void>;
  deleteWorkout(id: string): Promise<void>;
  /** Copies a whole snapshot in, used once when a browser's data moves to a new account. */
  importAll(s: Snapshot): Promise<void>;
}
