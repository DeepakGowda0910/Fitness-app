import type { SupabaseClient } from '@supabase/supabase-js';
import type { AssessmentDraft, StepId } from './assessment';
import { EPOCH, type Backend, type Snapshot } from './backend';
import type { StoredCheckin, StoredWeighIn } from './checkins';

/** Which assessment step each answer belongs to, for the `section` column. */
const SECTION: Record<keyof AssessmentDraft, StepId> = {
  sex: 'body',
  ageYears: 'body',
  heightCm: 'body',
  weightKg: 'body',
  knowsBodyFat: 'body',
  bodyFatPct: 'body',
  bodyFatSource: 'body',
  occupation: 'activity',
  avgDailySteps: 'activity',
  trainingDaysPerWeek: 'activity',
  sessionMinutes: 'activity',
  experience: 'activity',
  goal: 'goal',
  weeklyRatePct: 'goal',
  pregnant: 'health',
  breastfeeding: 'health',
  eatingDisorderHistory: 'health',
  conditions: 'health',
  weightAffectingMedication: 'health',
  dietType: 'food',
  allergies: 'food',
  mealsPerDay: 'food',
};
const KNOWN_KEYS = new Set(Object.keys(SECTION));

/** Weigh-ins are stored at midday UTC on their date, so the date survives any time zone. */
const measuredAtOf = (date: string) => `${date}T12:00:00.000Z`;

export const SUSPENDED_MESSAGE = 'This account has been suspended, so nothing is saved to it. Contact the app owner if you think this is a mistake.';

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Could not ${what}: ${res.error.message}`);
  return res.data;
}

/**
 * Reads and writes the signed-in user's data through Supabase. Every query
 * runs as that user, and row-level security limits it to their own rows.
 */
export async function cloudBackend(db: SupabaseClient, authUserId: string, email: string): Promise<Backend> {
  // The account row, created on first sign-in.
  let userId: string;
  const existing = check(
    await db.from('users').select('id, status').eq('auth_provider_id', authUserId).maybeSingle(),
    'load your account',
  ) as { id: string; status: string } | null;
  if (existing) {
    if (existing.status !== 'active') throw new Error(SUSPENDED_MESSAGE);
    userId = existing.id;
  } else {
    const inserted = await db.from('users').insert({ auth_provider_id: authUserId, email }).select('id').single();
    if (inserted.error?.code === '23505') {
      // Another tab or request created the row first: use it.
      const row = check(
        await db.from('users').select('id').eq('auth_provider_id', authUserId).single(),
        'load your account',
      ) as { id: string };
      userId = row.id;
    } else {
      userId = (check(inserted, 'create your account') as { id: string }).id;
    }
  }

  let assessmentId: string | null = null;

  async function ensureAssessment(since: string | undefined): Promise<string> {
    if (assessmentId) {
      if (since) {
        check(
          await db.from('assessments').update({ status: 'completed', completed_at: since, updated_at: new Date().toISOString() }).eq('id', assessmentId),
          'save your answers',
        );
      }
      return assessmentId;
    }
    const row = check(
      await db
        .from('assessments')
        .insert({ user_id: userId, version: 1, status: since ? 'completed' : 'draft', completed_at: since ?? null })
        .select('id')
        .single(),
      'save your answers',
    );
    assessmentId = (row as { id: string }).id;
    return assessmentId;
  }

  const backend: Backend = {
    async load(): Promise<Snapshot> {
      const a = check(
        await db.from('assessments').select('id, completed_at').order('version', { ascending: false }).limit(1).maybeSingle(),
        'load your answers',
      ) as { id: string; completed_at: string | null } | null;
      const draft: AssessmentDraft = {};
      if (a) {
        assessmentId = a.id;
        const answers = check(
          await db.from('assessment_answers').select('question_key, value').eq('assessment_id', a.id),
          'load your answers',
        ) as Array<{ question_key: string; value: unknown }>;
        for (const { question_key, value } of answers) {
          if (KNOWN_KEYS.has(question_key)) (draft as Record<string, unknown>)[question_key] = value;
        }
      }
      const weights = check(
        await db.from('body_measurements').select('measured_at, value, created_at').eq('type', 'weight').order('measured_at'),
        'load your weigh-ins',
      ) as Array<{ measured_at: string; value: number | string; created_at: string }>;
      const weeks = check(
        await db
          .from('weekly_checkins')
          .select('week_end, submitted_at, diet_adherence_pct, days_logged, hunger, energy, sleep_quality, cycle_phase')
          .not('submitted_at', 'is', null)
          .order('submitted_at'),
        'load your check-ins',
      ) as Array<{
        week_end: string;
        submitted_at: string;
        diet_adherence_pct: number;
        days_logged: number;
        hunger: number;
        energy: number;
        sleep_quality: number;
        cycle_phase: string | null;
      }>;
      return {
        draft,
        tracking: {
          since: a?.completed_at ? new Date(a.completed_at).toISOString() : EPOCH,
          weighIns: weights.map((w) => ({
            date: new Date(w.measured_at).toISOString().slice(0, 10),
            weightKg: Number(w.value),
            recordedAt: new Date(w.created_at).toISOString(),
          })),
          checkins: weeks.map((w) => ({
            weekEnd: w.week_end,
            submittedAt: new Date(w.submitted_at).toISOString(),
            dietAdherencePct: w.diet_adherence_pct,
            daysLogged: w.days_logged,
            hunger: w.hunger,
            energy: w.energy,
            sleepQuality: w.sleep_quality,
            cycleAware: w.cycle_phase === 'tracked',
          })),
        },
      };
    },

    async saveDraft(draft, since) {
      const id = await ensureAssessment(since);
      const entries = Object.entries(draft).filter(([k, v]) => KNOWN_KEYS.has(k) && v !== undefined);
      if (entries.length > 0) {
        check(
          await db.from('assessment_answers').upsert(
            entries.map(([k, v]) => ({
              assessment_id: id,
              section: SECTION[k as keyof AssessmentDraft],
              question_key: k,
              value: v,
              updated_at: new Date().toISOString(),
            })),
            { onConflict: 'assessment_id,question_key' },
          ),
          'save your answers',
        );
      }
      const cleared = [...KNOWN_KEYS].filter((k) => (draft as Record<string, unknown>)[k] === undefined);
      if (cleared.length > 0) {
        check(await db.from('assessment_answers').delete().eq('assessment_id', id).in('question_key', cleared), 'save your answers');
      }
    },

    async putWeighIn(date, weightKg, recordedAt): Promise<StoredWeighIn> {
      check(await db.from('body_measurements').delete().eq('type', 'weight').eq('measured_at', measuredAtOf(date)), 'save your weigh-in');
      check(
        await db.from('body_measurements').insert({
          user_id: userId,
          measured_at: measuredAtOf(date),
          type: 'weight',
          value: weightKg,
          unit: 'kg',
          source: 'measured_manual',
          created_at: recordedAt,
        }),
        'save your weigh-in',
      );
      return { date, weightKg, recordedAt };
    },

    async deleteWeighIn(date) {
      check(await db.from('body_measurements').delete().eq('type', 'weight').eq('measured_at', measuredAtOf(date)), 'remove the weigh-in');
    },

    async addCheckin(c: StoredCheckin, weekNo: number) {
      check(
        await db.from('weekly_checkins').insert({
          user_id: userId,
          week_no: weekNo,
          week_end: c.weekEnd,
          due_at: c.submittedAt,
          submitted_at: c.submittedAt,
          diet_adherence_pct: c.dietAdherencePct,
          days_logged: c.daysLogged,
          hunger: c.hunger,
          energy: c.energy,
          sleep_quality: c.sleepQuality,
          cycle_phase: c.cycleAware ? 'tracked' : null,
        }),
        'save your check-in',
      );
    },

    async importAll(s) {
      if (Object.keys(s.draft).length > 0) await backend.saveDraft(s.draft, s.tracking.since === EPOCH ? undefined : s.tracking.since);
      for (const w of s.tracking.weighIns) await backend.putWeighIn(w.date, w.weightKg, w.recordedAt);
      let n = 0;
      for (const c of s.tracking.checkins) await backend.addCheckin(c, ++n);
    },
  };
  return backend;
}
