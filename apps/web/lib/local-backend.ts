import type { AssessmentDraft } from './assessment';
import { emptySnapshot, type Backend, type Snapshot } from './backend';
import { withWeighIn } from './checkins';

export const LOCAL_KEY = 'fitness.data.v2';
/** Assessment answers saved by the first version of the app. */
const LEGACY_ASSESSMENT_KEY = 'fitness.assessment.v1';

function read(): Snapshot {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (raw) return { ...emptySnapshot(), ...(JSON.parse(raw) as Snapshot) };
    const legacy = window.localStorage.getItem(LEGACY_ASSESSMENT_KEY);
    if (legacy) return { ...emptySnapshot(), draft: JSON.parse(legacy) as AssessmentDraft };
  } catch {
    // unreadable: start empty
  }
  return emptySnapshot();
}

function write(s: Snapshot) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
  } catch {
    // Private mode or storage full: data lasts for this visit only.
  }
}

/** Keeps everything in this browser's local storage. */
export function localBackend(): Backend {
  let s = emptySnapshot();
  const save = (next: Snapshot) => {
    s = next;
    write(s);
  };
  return {
    async load() {
      s = read();
      return s;
    },
    async saveDraft(draft, since) {
      save({ ...s, draft, tracking: { ...s.tracking, since: since ?? s.tracking.since } });
    },
    async putWeighIn(date, weightKg, recordedAt) {
      const w = { date, weightKg, recordedAt };
      save({ ...s, tracking: { ...s.tracking, weighIns: withWeighIn(s.tracking.weighIns, w) } });
      return w;
    },
    async deleteWeighIn(date) {
      save({ ...s, tracking: { ...s.tracking, weighIns: s.tracking.weighIns.filter((w) => w.date !== date) } });
    },
    async addCheckin(checkin) {
      save({ ...s, tracking: { ...s.tracking, checkins: [...s.tracking.checkins, checkin] } });
    },
    async addWorkout(w) {
      save({ ...s, workouts: [...s.workouts.filter((x) => x.id !== w.id), w] });
    },
    async deleteWorkout(id) {
      save({ ...s, workouts: s.workouts.filter((x) => x.id !== id) });
    },
    async importAll(next) {
      save(next);
    },
  };
}
