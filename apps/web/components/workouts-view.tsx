'use client';

import {
  exerciseById,
  generateProgram,
  nextDayIndex,
  ProgramError,
  SPLIT_STYLES,
  splitStylesFor,
  type SplitStyle,
  suggestNext,
  type LoggedSet,
  type PlannedExercise,
  type Program,
  type ProgramDay,
} from '@fitness/workout-planner';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '@/lib/app-data';
import type { AssessmentDraft, Equipment } from '@/lib/assessment';
import { EQUIPMENT, labelOf } from '@/lib/labels';
import { localToday } from '@/lib/plan';
import {
  lastSetsFor,
  newWorkoutId,
  programRequestOf,
  sortWorkouts,
  volumeKg,
  workoutsThisWeek,
  type StoredWorkout,
} from '@/lib/workouts';
import { ExerciseDemo } from './exercise-demo';
import { Notice } from './fields';

const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const IN_PROGRESS_KEY = 'fitness.workout.inprogress.v1';
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtKg = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} kg`;

const btnPrimary = 'inline-flex h-12 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-50';
const btnSecondary = 'inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2';

export function WorkoutsView() {
  const { ready, draft } = useAppData();
  if (!ready) return <div className="h-[32rem] animate-pulse rounded-2xl bg-surface-2" aria-label="Loading" />;
  if (draft.trainingDaysPerWeek === undefined || !draft.experience) return <NeedAnswers />;
  if (draft.trainingDaysPerWeek === 0) return <NotTrainingYet draft={draft} />;
  return <Workouts draft={draft} />;
}

function NeedAnswers() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-6 text-center sm:p-10">
      <h1 className="text-2xl font-semibold">Answer a few questions first</h1>
      <p className="mt-2 text-muted">Your workout plan is built from your training days, session length, experience and goal.</p>
      <Link href="/assessment" className={`${btnPrimary} mt-6`}>
        Start the assessment
      </Link>
    </div>
  );
}

function NotTrainingYet({ draft }: { draft: AssessmentDraft }) {
  const { saveDraft } = useAppData();
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-6 sm:p-10">
      <h1 className="text-2xl font-semibold">You don’t train yet</h1>
      <p className="mt-2 text-muted">
        Two short strength sessions a week is a great start: it keeps muscle, helps blood sugar and makes daily life easier. Adding them also
        raises your calorie target a little, because you’ll be more active.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className={btnPrimary}
          onClick={() => saveDraft({ ...draft, trainingDaysPerWeek: 2, sessionMinutes: draft.sessionMinutes ?? 45 })}
        >
          Plan 2 days a week, 45 min
        </button>
        <Link href="/assessment" className={`${btnSecondary} h-12`}>
          Choose my own days
        </Link>
      </div>
    </div>
  );
}

/** A health answer that means a doctor should OK a new exercise plan. */
function needsDoctorOk(d: AssessmentDraft): boolean {
  return !!d.pregnant || (d.conditions ?? []).some((c) => c === 'heart_disease' || c === 'diabetes_insulin' || c === 'diabetes_sulfonylurea' || c === 'kidney_disease');
}

function Workouts({ draft }: { draft: AssessmentDraft }) {
  const { workouts, saveDraft, addWorkout, removeWorkout } = useAppData();
  const request = programRequestOf(draft)!;
  const result = useMemo((): { program: Program } | { error: string } => {
    try {
      return { program: generateProgram(request) };
    } catch (err) {
      return { error: err instanceof ProgramError ? err.message : 'Something went wrong building your plan.' };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.daysPerWeek, request.sessionMinutes, request.experience, request.goal, request.equipment, request.split]);

  const sorted = useMemo(() => sortWorkouts(workouts), [workouts]);
  const [selected, setSelected] = useState<number | null>(null);
  const [active, setActive] = useState<InProgress | null>(null);
  const [justSaved, setJustSaved] = useState<StoredWorkout | null>(null);

  // Pick up a workout left open (page reload, phone locked).
  useEffect(() => setActive(readInProgress()), []);

  if ('error' in result) return <Notice tone="danger">{result.error}</Notice>;
  const { program } = result;
  const next = nextDayIndex(program, sorted.map((w) => w.dayKey));
  const dayIdx = Math.min(selected ?? next, program.days.length - 1);
  const day = program.days[dayIdx]!;
  const today = localToday();
  const doneThisWeek = workoutsThisWeek(workouts, today);

  if (active) {
    const activeDay = program.days.find((d) => d.key === active.dayKey);
    if (activeDay) {
      return (
        <Logger
          day={activeDay}
          program={program}
          state={active}
          history={workouts}
          onChange={(s) => {
            setActive(s);
            writeInProgress(s);
          }}
          onCancel={() => {
            setActive(null);
            writeInProgress(null);
          }}
          onFinish={(w) => {
            addWorkout(w);
            setActive(null);
            writeInProgress(null);
            setJustSaved(w);
            setSelected(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      );
    }
  }

  const start = (d: ProgramDay) => {
    const s = newInProgress(d, workouts);
    setActive(s);
    writeInProgress(s);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            {program.splitName} · about {request.sessionMinutes} min
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Your workout plan</h1>
        </div>
        <Link href="/assessment" className={btnSecondary}>
          Change days or time
        </Link>
      </div>

      {justSaved ? <SavedCard w={justSaved} onClose={() => setJustSaved(null)} /> : null}

      {needsDoctorOk(draft) ? (
        <Notice tone="warn">
          Because of your health answers, check with your doctor before starting a new exercise plan, and stop any exercise that causes chest
          pain, dizziness or unusual breathlessness.
        </Notice>
      ) : null}

      <StylePicker
        program={program}
        onChange={(split) => {
          setSelected(null);
          saveDraft({ ...draft, split: split === program.recommendedStyle ? undefined : split });
        }}
      />

      <DayTabs program={program} selected={dayIdx} next={next} onSelect={setSelected} />

      <DayCard day={day} history={workouts} onStart={() => start(day)} isNext={dayIdx === next} />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">This week (Mon–Sun)</p>
          <p className="mt-1 text-2xl font-semibold">
            {doneThisWeek} of {program.daysPerWeek} workouts
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (doneThisWeek / program.daysPerWeek) * 100)}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="mb-2 text-sm text-muted">Where you train</p>
          <EquipmentPicker value={request.equipment} onChange={(equipment) => saveDraft({ ...draft, equipment })} />
        </div>
      </div>

      {program.notes.length > 0 ? (
        <Notice>
          <ul className="list-disc space-y-1 pl-5">
            {program.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <History workouts={sorted} onRemove={removeWorkout} />

      <p className="text-xs text-muted">
        Plans follow standard strength-training guidance: each muscle about twice a week, rep ranges matched to your goal, and weight added only
        after every set reaches the top of its range. Warm up for 5 to 10 minutes first. Planner {program.version}.
      </p>
    </div>
  );
}

function DayTabs({ program, selected, next, onSelect }: { program: Program; selected: number; next: number; onSelect: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the chosen day in view on phones, where the tabs scroll sideways.
  useEffect(() => {
    const box = ref.current;
    const el = box?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!box || !el) return;
    // Scroll only the tab strip sideways, never the page.
    const left = el.offsetLeft - box.offsetLeft;
    if (left < box.scrollLeft || left + el.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollLeft = left - 16;
  }, [selected]);
  return (
      <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0" ref={ref} role="tablist" aria-label="Workout day">
        <div className="flex gap-2">
          {program.days.map((d, i) => {
            const isSel = i === selected;
            return (
              <button
                key={d.key}
                type="button"
                role="tab"
                aria-selected={isSel}
                onClick={() => onSelect(i)}
                className={`flex min-w-28 shrink-0 flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors lg:min-w-0 lg:flex-1 ${
                  isSel ? 'border-brand bg-brand text-on-brand' : 'border-border bg-surface hover:border-muted'
                }`}
              >
                <span className={`text-xs ${isSel ? 'opacity-90' : 'text-muted'}`}>
                  Day {i + 1} · {WEEKDAY[d.weekday]}
                  {i === next ? ' · Next' : ''}
                </span>
                <span className="font-semibold leading-tight">{d.name}</span>
              </button>
            );
          })}
        </div>
      </div>

  );
}

function StylePicker({ program, onChange }: { program: Program; onChange: (s: SplitStyle) => void }) {
  const offered = splitStylesFor(program.daysPerWeek);
  return (
    <section aria-labelledby="style-heading">
      <h2 id="style-heading" className="mb-2 text-sm font-medium text-muted">
        Plan style · pick one of three
      </h2>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-labelledby="style-heading">
        {SPLIT_STYLES.map((o) => {
          const on = o.value === program.style;
          const allowed = offered.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!allowed}
              onClick={() => onChange(o.value)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                on ? 'border-brand bg-brand-soft' : 'border-border bg-surface hover:border-muted'
              }`}
            >
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                {o.label}
                {o.value === program.recommendedStyle ? (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-on-brand">Recommended</span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-sm text-muted">{allowed ? o.hint : `Needs ${o.minDays}+ training days a week.`}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EquipmentPicker({ value, onChange }: { value: Equipment; onChange: (e: Equipment) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Where you train">
      {EQUIPMENT.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-medium leading-tight ${on ? 'border-brand bg-brand-soft text-text' : 'border-border bg-surface text-muted hover:border-muted'}`}
          >
            {o.value === 'gym' ? 'Gym' : o.value === 'dumbbells' ? 'Home, dumbbells' : 'No equipment'}
          </button>
        );
      })}
    </div>
  );
}

function prescription(p: PlannedExercise): string {
  const unit = p.unit === 'reps' ? '' : p.unit === 'seconds' ? ' s' : ' min';
  const range = p.repsMin === p.repsMax ? `${p.repsMin}` : `${p.repsMin}–${p.repsMax}`;
  const side = p.perSide ? ' each side' : '';
  if (p.unit === 'minutes') return `${range} min`;
  return `${p.sets} × ${range}${unit}${side}`;
}

function restText(sec: number): string {
  if (sec <= 0) return '';
  return sec >= 120 ? `${sec / 60} min rest` : `${sec} s rest`;
}

function lastText(sets: LoggedSet[], unit: PlannedExercise['unit']): string {
  const w = sets.map((s) => s.weightKg ?? 0);
  const sameWeight = w.every((x) => x === w[0]);
  const u = unit === 'seconds' ? ' s' : unit === 'minutes' ? ' min' : '';
  if (sameWeight) return `${w[0] ? `${fmtKg(w[0])} × ` : ''}${sets.map((s) => `${s.reps}${u}`).join(', ')}`;
  return sets.map((s) => `${s.weightKg ? `${s.weightKg}×` : ''}${s.reps}${u}`).join(', ');
}

function DayCard({ day, history, onStart, isNext }: { day: ProgramDay; history: StoredWorkout[]; onStart: () => void; isNext: boolean }) {
  return (
    <section className="rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="text-xl font-semibold">{day.name}</h2>
          <p className="text-sm text-muted">
            {day.focus} · {day.exercises.length} exercises · about {day.estMinutes} min with warm-up
          </p>
        </div>
        <button type="button" onClick={onStart} className={`${btnPrimary} w-full sm:w-auto`}>
          {isNext ? 'Start this workout' : 'Start this one instead'}
        </button>
      </div>
      <ol className="divide-y divide-border">
        {day.exercises.map((p, i) => {
          const e = exerciseById(p.exerciseId);
          const last = lastSetsFor(history, p.exerciseId);
          const s = suggestNext(p, last?.sets);
          return (
            <li key={p.exerciseId} className="p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-sm font-medium">
                      {prescription(p)}
                      {p.restSec > 0 ? <span className="font-normal text-muted"> · {restText(p.restSec)}</span> : null}
                    </p>
                  </div>
                  {e ? <p className="text-sm text-muted">{e.muscles}</p> : null}
                  </div>
                  <div>
                  {last ? (
                    <p className="mt-2 text-sm">
                      <span className="text-muted">Last time ({fmtDate(last.date)}):</span> {lastText(last.sets, p.unit)}
                    </p>
                  ) : null}
                  <p className={`mt-1 text-sm ${s.kind === 'increase' ? 'font-medium text-brand' : 'text-muted'}`}>{s.note}</p>
                  <HowToDoIt exerciseId={p.exerciseId} name={p.name} />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function History({ workouts, onRemove }: { workouts: StoredWorkout[]; onRemove: (id: string) => void }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (workouts.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted">
        Workouts you finish appear here, with the weights you lifted. Next time, the plan shows what you did and what to aim for.
      </section>
    );
  }
  const shown = showAll ? workouts : workouts.slice(0, 8);
  return (
    <section className="rounded-2xl border border-border bg-surface">
      <h2 className="border-b border-border p-5 text-lg font-semibold">Workout history</h2>
      <ul className="divide-y divide-border">
        {shown.map((w) => {
          const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
          const vol = volumeKg(w);
          return (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {w.dayName} <span className="font-normal text-muted">· {fmtDate(w.date)}</span>
                </p>
                <p className="text-sm text-muted">
                  {w.exercises.length} exercise{w.exercises.length === 1 ? '' : 's'} · {sets} set{sets === 1 ? '' : 's'}{vol > 0 ? ` · ${vol.toLocaleString('en-IN')} kg lifted` : ''}
                  {w.durationMin ? ` · ${w.durationMin} min` : ''}
                  {w.effort ? ` · effort ${w.effort}/5` : ''}
                </p>
              </div>
              {confirming === w.id ? (
                <div className="flex gap-2">
                  <button type="button" className={btnSecondary} onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center rounded-xl border border-danger-border bg-danger-bg px-4 text-sm font-medium text-danger-text"
                    onClick={() => {
                      onRemove(w.id);
                      setConfirming(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button type="button" className="text-sm text-muted underline hover:text-text" onClick={() => setConfirming(w.id)}>
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {workouts.length > shown.length ? (
        <button type="button" className="w-full border-t border-border p-4 text-sm font-medium text-brand" onClick={() => setShowAll(true)}>
          Show all {workouts.length}
        </button>
      ) : null}
    </section>
  );
}

function SavedCard({ w, onClose }: { w: StoredWorkout; onClose: () => void }) {
  const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
  const vol = volumeKg(w);
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand bg-brand-soft p-5">
      <div>
        <p className="font-semibold">Workout saved. Nice work.</p>
        <p className="text-sm">
          {w.dayName}: {sets} set{sets === 1 ? '' : 's'}{vol > 0 ? `, ${vol.toLocaleString('en-IN')} kg lifted` : ''}
          {w.durationMin ? ` in ${w.durationMin} min` : ''}.
        </p>
      </div>
      <button type="button" className={btnSecondary} onClick={onClose}>
        Close
      </button>
    </div>
  );
}

// ---------- Logging a workout ----------

interface SetRow {
  weight: string;
  reps: string;
  done: boolean;
}

interface InProgress {
  id: string;
  dayKey: string;
  date: string;
  startedAt: string;
  /** Sets for each planned exercise, by exercise id. */
  sets: Record<string, SetRow[]>;
  effort?: number | undefined;
  notes: string;
}

function readInProgress(): InProgress | null {
  try {
    const raw = window.localStorage.getItem(IN_PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as InProgress) : null;
  } catch {
    return null;
  }
}

function writeInProgress(s: InProgress | null) {
  try {
    if (s) window.localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(IN_PROGRESS_KEY);
  } catch {
    // Private mode: the workout lasts until the page closes.
  }
}

function usesWeight(p: PlannedExercise): boolean {
  const e = exerciseById(p.exerciseId);
  return p.unit === 'reps' && !!e && e.load !== 'bodyweight';
}

function newInProgress(day: ProgramDay, history: StoredWorkout[]): InProgress {
  const sets: Record<string, SetRow[]> = {};
  for (const p of day.exercises) {
    const s = suggestNext(p, lastSetsFor(history, p.exerciseId)?.sets);
    const weight = usesWeight(p) && s.weightKg !== null ? String(s.weightKg) : '';
    sets[p.exerciseId] = Array.from({ length: p.sets }, () => ({ weight, reps: '', done: false }));
  }
  return { id: newWorkoutId(), dayKey: day.key, date: localToday(), startedAt: new Date().toISOString(), sets, notes: '' };
}

function Logger({
  day,
  program,
  state,
  history,
  onChange,
  onCancel,
  onFinish,
}: {
  day: ProgramDay;
  program: Program;
  state: InProgress;
  history: StoredWorkout[];
  onChange: (s: InProgress) => void;
  onCancel: () => void;
  onFinish: (w: StoredWorkout) => void;
}) {
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedMin = Math.max(0, Math.floor((now - new Date(state.startedAt).getTime()) / 60000));
  const restLeft = rest ? Math.max(0, Math.ceil((rest.until - now) / 1000)) : 0;

  const setRow = (exerciseId: string, i: number, patch: Partial<SetRow>) => {
    const rows = [...(state.sets[exerciseId] ?? [])];
    rows[i] = { ...rows[i]!, ...patch };
    // A new weight carries down to the sets after it that haven't been done yet.
    if (patch.weight !== undefined) for (let j = i + 1; j < rows.length; j++) if (!rows[j]!.done) rows[j] = { ...rows[j]!, weight: patch.weight };
    onChange({ ...state, sets: { ...state.sets, [exerciseId]: rows } });
  };

  const finish = () => {
    const exercises = day.exercises
      .map((p) => ({
        exerciseId: p.exerciseId,
        name: p.name,
        sets: (state.sets[p.exerciseId] ?? [])
          .map((r) => ({ weightKg: usesWeight(p) && r.weight.trim() !== '' ? Number(r.weight) : null, reps: Number(r.reps) }))
          .filter((s) => Number.isFinite(s.reps) && s.reps > 0 && (s.weightKg === null || (Number.isFinite(s.weightKg) && s.weightKg >= 0))),
      }))
      .filter((e) => e.sets.length > 0);
    if (exercises.length === 0) {
      setError('Enter the reps for at least one set before finishing.');
      return;
    }
    const minutes = Math.round((Date.now() - new Date(state.startedAt).getTime()) / 60000);
    onFinish({
      id: state.id,
      date: state.date,
      dayKey: day.key,
      dayName: day.name,
      plannerVersion: program.version,
      durationMin: minutes >= 1 && minutes <= 600 ? minutes : undefined,
      effort: state.effort,
      exercises,
      notes: state.notes.trim() || undefined,
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            In progress · {elapsedMin} min · {fmtDate(state.date)}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{day.name}</h1>
        </div>
        {confirmCancel ? (
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={() => setConfirmCancel(false)}>
              Keep going
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-xl border border-danger-border bg-danger-bg px-4 text-sm font-medium text-danger-text"
              onClick={onCancel}
            >
              Discard workout
            </button>
          </div>
        ) : (
          <button type="button" className={btnSecondary} onClick={() => setConfirmCancel(true)}>
            Cancel
          </button>
        )}
      </div>

      <p className="text-sm text-muted">Warm up for 5 to 10 minutes. Enter what you actually did and tick each set; the rest timer starts on its own.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        {day.exercises.map((p) => {
          const last = lastSetsFor(history, p.exerciseId);
          const s = suggestNext(p, last?.sets);
          const rows = state.sets[p.exerciseId] ?? [];
          const weighted = usesWeight(p);
          const unitLabel = p.unit === 'reps' ? 'Reps' : p.unit === 'seconds' ? 'Seconds' : 'Minutes';
          return (
            <section key={p.exerciseId} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h2 className="font-semibold">{p.name}</h2>
                <p className="text-sm text-muted">{prescription(p)}</p>
              </div>
              <p className="mt-1 text-sm text-muted">
                {last ? `Last: ${lastText(last.sets, p.unit)}. ` : ''}
                {s.note}
              </p>
              <HowToDoIt exerciseId={p.exerciseId} name={p.name} />
              <div className={`mt-3 grid items-center gap-2 text-xs font-medium text-muted ${weighted ? 'grid-cols-[2.5rem_1fr_1fr_3rem]' : 'grid-cols-[2.5rem_1fr_3rem]'}`}>
                <span>Set</span>
                {weighted ? <span>kg</span> : null}
                <span>{unitLabel}</span>
                <span className="text-center">Done</span>
              </div>
              <div className="mt-1 space-y-2">
                {rows.map((r, i) => (
                  <div
                    key={i}
                    className={`grid items-center gap-2 ${weighted ? 'grid-cols-[2.5rem_1fr_1fr_3rem]' : 'grid-cols-[2.5rem_1fr_3rem]'}`}
                  >
                    <span className="text-center font-semibold">{i + 1}</span>
                    {weighted ? (
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        aria-label={`${p.name} set ${i + 1} weight in kg`}
                        placeholder="kg"
                        className="h-11 w-full min-w-0 rounded-lg border border-border bg-bg px-3 text-base outline-none focus:border-brand"
                        value={r.weight}
                        onChange={(e) => setRow(p.exerciseId, i, { weight: e.target.value })}
                      />
                    ) : null}
                    <input
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="0"
                      aria-label={`${p.name} set ${i + 1} ${unitLabel.toLowerCase()}`}
                      placeholder={String(s.targetReps)}
                      className="h-11 w-full min-w-0 rounded-lg border border-border bg-bg px-3 text-base outline-none focus:border-brand"
                      value={r.reps}
                      onChange={(e) => setRow(p.exerciseId, i, { reps: e.target.value })}
                    />
                    <button
                      type="button"
                      aria-pressed={r.done}
                      aria-label={`Set ${i + 1} done`}
                      onClick={() => {
                        const done = !r.done;
                        // Ticking an empty set counts it as the target.
                        setRow(p.exerciseId, i, { done, reps: done && r.reps === '' ? String(s.targetReps) : r.reps });
                        if (done && p.restSec > 0) setRest({ until: Date.now() + p.restSec * 1000, total: p.restSec });
                      }}
                      className="group grid h-11 w-12 place-items-center rounded-lg"
                    >
                      {/* A real tick box: empty until the set is done, then filled with a tick. */}
                      <span
                        aria-hidden
                        className={`grid size-7 place-items-center rounded-md border-2 text-base font-bold leading-none ${
                          r.done ? 'border-brand bg-brand text-on-brand' : 'border-muted bg-surface text-transparent group-hover:border-brand'
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-2 text-sm font-medium text-brand"
                onClick={() => {
                  const lastRow = rows.at(-1);
                  onChange({ ...state, sets: { ...state.sets, [p.exerciseId]: [...rows, { weight: lastRow?.weight ?? '', reps: '', done: false }] } });
                }}
              >
                + Add a set
              </button>
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-semibold">How hard was it?</h2>
        <p className="text-sm text-muted">Optional. 1 is easy, 5 is all-out.</p>
        <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Effort">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={state.effort === n}
              onClick={() => onChange({ ...state, effort: state.effort === n ? undefined : n })}
              className={`h-11 rounded-xl border font-semibold ${state.effort === n ? 'border-brand bg-brand-soft' : 'border-border bg-surface text-muted'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm font-medium" htmlFor="workout-notes">
          Notes
        </label>
        <textarea
          id="workout-notes"
          rows={2}
          maxLength={500}
          placeholder="Optional, e.g. left knee felt sore on lunges"
          className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-base outline-none focus:border-brand"
          value={state.notes}
          onChange={(e) => onChange({ ...state, notes: e.target.value })}
        />
        {error ? (
          <p className="mt-3 text-sm font-medium text-danger-text" role="alert">
            {error}
          </p>
        ) : null}
        <button type="button" className={`${btnPrimary} mt-4 w-full`} onClick={finish}>
          Finish and save workout
        </button>
      </section>

      {rest && restLeft > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur" role="timer" aria-live="off">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted">Rest</p>
              <p className="text-2xl font-semibold tabular-nums">
                {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-brand transition-all" style={{ width: `${(restLeft / rest.total) * 100}%` }} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className={btnSecondary} onClick={() => setRest({ ...rest, until: rest.until + 30000, total: rest.total + 30 })}>
                +30 s
              </button>
              <button type="button" className={btnSecondary} onClick={() => setRest(null)}>
                Skip
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** A demo you can open mid-workout; it only loads once opened. */
/**
 * "How to do it": the demonstration clip next to the written steps. Closed by
 * default; the clip is only created (and downloaded) once it is opened.
 */
function HowToDoIt({ exerciseId, name }: { exerciseId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const cues = exerciseById(exerciseId)?.cues ?? [];
  return (
    <details className="mt-2 text-sm" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-brand">How to do it</summary>
      {open ? (
        <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:items-start">
          <ExerciseDemo exerciseId={exerciseId} name={name} />
          {cues.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-muted">
              {cues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </details>
  );
}
