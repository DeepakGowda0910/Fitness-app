import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Everything one client has entered, as returned by admin_user_inputs()
 * (packages/db/migrations/0010_admin_user_inputs.sql). Every call is
 * written to the audit log, and the client can see it there.
 */
export interface ClientInputs {
  assessment: { status: 'draft' | 'completed'; completed_at: string | null; updated_at: string; answers: Record<string, unknown> } | null;
  weigh_ins: Array<{ measured_at: string; value: number | string; unit: string; source: string; recorded_at: string }>;
  checkins: Array<{
    week_no: number;
    week_end: string;
    submitted_at: string;
    days_logged: number | null;
    diet_adherence_pct: number | null;
    workout_adherence_pct: number | null;
    hunger: number | null;
    energy: number | null;
    sleep_quality: number | null;
    recovery: number | null;
    satisfaction: number | null;
    challenges: string | null;
    cycle_phase: string | null;
  }>;
  workouts: Array<{
    performed_on: string;
    day_name: string;
    duration_min: number | null;
    effort: number | null;
    exercises: Array<{ exerciseId: string; name: string; sets: Array<{ weightKg: number | null; reps: number }> }>;
    notes: string | null;
    completed_at: string;
  }>;
}

export async function clientInputs(db: SupabaseClient, userId: string): Promise<ClientInputs> {
  const { data, error } = await db.rpc('admin_user_inputs', { target: userId });
  if (error) throw new Error(`Could not load this client's entries: ${error.message}`);
  return data as ClientInputs;
}

// ---------- Plain-words labels (same wording as the app's questions) ----------

export const HUNGER = ['None', 'A little', 'Moderate', 'Often hungry', 'Very hungry'];
export const ENERGY = ['Very low', 'Low', 'Normal', 'Good', 'Very good'];
export const SLEEP = ['Very poor', 'Poor', 'OK', 'Good', 'Very good'];


/** "Good (4/5)", or "–" when not answered. */
export function scaleLabel(labels: string[], v: number | null | undefined): string {
  if (v == null) return '–';
  return `${labels[v - 1] ?? v} (${v}/5)`;
}

const VALUE_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  sedentary: 'Mostly sitting',
  light: 'On my feet some of the day',
  moderate: 'On my feet most of the day',
  heavy: 'Physical work',
  beginner: 'New to training',
  intermediate: 'Some experience',
  advanced: 'Experienced',
  gym: 'At a gym',
  dumbbells: 'At home with dumbbells',
  bodyweight: 'At home, no equipment',
  full_body: 'Full body',
  upper_lower: 'Upper / lower',
  ppl: 'Push / pull / legs',
  fat_loss: 'Lose fat',
  recomposition: 'Lose fat and build muscle',
  lean_gain: 'Build muscle',
  weight_gain: 'Gain weight',
  maintenance: 'Stay where I am',
  strength: 'Get stronger',
  endurance: 'Endurance',
  professional: 'DEXA scan or a professional',
  measured_device: 'Smart scale or body-fat device',
  user_estimate: 'Own estimate',
  diabetes_insulin: 'Diabetes, on insulin',
  diabetes_sulfonylurea: 'Diabetes, on sulfonylurea tablets',
  diabetes_other: 'Diabetes, other treatment',
  kidney_disease: 'Kidney disease',
  heart_disease: 'Heart disease',
  thyroid: 'Thyroid condition',
  other: 'Another long-term condition',
  vegetarian: 'Vegetarian',
  eggetarian: 'Eggetarian',
  non_vegetarian: 'Non-vegetarian',
  pescatarian: 'Pescatarian',
  jain: 'Jain',
  vegan: 'Vegan',
  dairy: 'Milk',
  gluten: 'Gluten (wheat)',
  peanut: 'Peanut',
  tree_nut: 'Tree nuts',
  soy: 'Soy',
  egg: 'Egg',
  fish: 'Fish',
  shellfish: 'Shellfish',
  sesame: 'Sesame',
};

type Section = 'About them' | 'Activity and training' | 'Goal' | 'Health check' | 'Food';

const QUESTIONS: Array<{ key: string; label: string; section: Section; unit?: string; format?: (v: unknown) => string }> = [
  { key: 'sex', label: 'Sex (for calculations)', section: 'About them' },
  { key: 'ageYears', label: 'Age', section: 'About them', unit: 'years' },
  { key: 'heightCm', label: 'Height', section: 'About them', unit: 'cm' },
  { key: 'weightKg', label: 'Weight at assessment', section: 'About them', unit: 'kg' },
  { key: 'knowsBodyFat', label: 'Knows body fat', section: 'About them' },
  { key: 'bodyFatPct', label: 'Body fat', section: 'About them', unit: '%' },
  { key: 'bodyFatSource', label: 'Body fat measured by', section: 'About them' },
  { key: 'occupation', label: 'Daily work', section: 'Activity and training' },
  { key: 'avgDailySteps', label: 'Steps a day', section: 'Activity and training', format: (v) => Number(v).toLocaleString('en-IN') },
  { key: 'trainingDaysPerWeek', label: 'Training days a week', section: 'Activity and training' },
  { key: 'sessionMinutes', label: 'Session length', section: 'Activity and training', unit: 'min' },
  { key: 'experience', label: 'Training experience', section: 'Activity and training' },
  { key: 'equipment', label: 'Trains', section: 'Activity and training' },
  { key: 'split', label: 'Workout plan style', section: 'Activity and training' },
  { key: 'goal', label: 'Goal', section: 'Goal' },
  { key: 'weeklyRatePct', label: 'Pace', section: 'Goal', format: (v) => `${v}% of body weight a week` },
  { key: 'pregnant', label: 'Pregnant', section: 'Health check' },
  { key: 'breastfeeding', label: 'Breastfeeding', section: 'Health check' },
  { key: 'eatingDisorderHistory', label: 'Eating disorder history', section: 'Health check' },
  { key: 'conditions', label: 'Health conditions', section: 'Health check' },
  { key: 'weightAffectingMedication', label: 'Medication that affects weight', section: 'Health check' },
  { key: 'dietType', label: 'Diet', section: 'Food' },
  { key: 'allergies', label: 'Allergies', section: 'Food' },
  { key: 'mealsPerDay', label: 'Meals a day', section: 'Food' },
];

export const SECTIONS: Section[] = ['About them', 'Activity and training', 'Goal', 'Health check', 'Food'];

function plain(v: unknown): string {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (Array.isArray(v)) return v.length === 0 ? 'None' : v.map(plain).join(', ');
  if (typeof v === 'string') return VALUE_LABELS[v] ?? v;
  return String(v);
}

/** The client's answers grouped by assessment step, in the app's order, in plain words. Unknown keys go under "Other". */
export function answerRows(answers: Record<string, unknown>): Array<{ section: string; rows: Array<{ label: string; value: string }> }> {
  const groups = new Map<string, Array<{ label: string; value: string }>>();
  const known = new Set<string>();
  for (const q of QUESTIONS) {
    known.add(q.key);
    if (!(q.key in answers)) continue;
    const v = answers[q.key];
    const text = q.format ? q.format(v) : `${plain(v)}${q.unit ? ` ${q.unit}` : ''}`;
    if (!groups.has(q.section)) groups.set(q.section, []);
    groups.get(q.section)!.push({ label: q.label, value: text });
  }
  const others = Object.keys(answers)
    .filter((k) => !known.has(k))
    .sort()
    .map((k) => ({ label: k, value: plain(answers[k]) }));
  const out = SECTIONS.filter((s) => groups.has(s)).map((s) => ({ section: s as string, rows: groups.get(s)! }));
  if (others.length) out.push({ section: 'Other', rows: others });
  return out;
}

/** "40 kg × 10", "Bodyweight × 12". */
export function setLabel(s: { weightKg: number | null; reps: number }): string {
  return `${s.weightKg ? `${s.weightKg} kg` : 'Bodyweight'} × ${s.reps}`;
}

/** Total weight moved in a workout (kg × reps over all sets), for a quick sense of volume. */
export function workoutVolumeKg(w: ClientInputs['workouts'][number]): number {
  return w.exercises.reduce((sum, e) => sum + e.sets.reduce((s, x) => s + (x.weightKg ?? 0) * x.reps, 0), 0);
}
