'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  firstIncompleteStep,
  normalise,
  STEPS,
  validateStep,
  type AssessmentDraft,
  type StepErrors,
  type StepId,
} from '@/lib/assessment';
import {
  ALLERGENS,
  BODY_FAT_SOURCES,
  CONDITIONS,
  DIET_TYPES,
  EXPERIENCE,
  FAT_LOSS_PACE,
  GOALS,
  labelOf,
  OCCUPATIONS,
} from '@/lib/labels';
import { useAssessmentDraft } from '@/lib/storage';
import { CheckGroup, ChoiceGroup, Fieldset, Notice, NumberField, YesNo } from './fields';

export function AssessmentWizard() {
  const router = useRouter();
  const { draft, ready, update } = useAssessmentDraft();
  const [step, setStep] = useState<StepId>('body');
  const [showErrors, setShowErrors] = useState(false);
  const [started, setStarted] = useState(false);

  // A returning user continues where they left off.
  useEffect(() => {
    if (ready && !started) {
      setStep(firstIncompleteStep(draft));
      setStarted(true);
    }
  }, [ready, started, draft]);

  const index = STEPS.findIndex((s) => s.id === step);
  const meta = STEPS[index]!;
  const errors: StepErrors = showErrors ? validateStep(step, draft) : {};
  const set = (patch: Partial<AssessmentDraft>) => update(normalise({ ...draft, ...patch }));

  const go = (to: StepId) => {
    setStep(to);
    setShowErrors(false);
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    if (Object.keys(validateStep(step, draft)).length > 0) {
      setShowErrors(true);
      return;
    }
    if (step === 'review') {
      router.push('/results');
      return;
    }
    go(STEPS[index + 1]!.id);
  };

  const reachable = (i: number) => STEPS.slice(0, i).every((s) => Object.keys(validateStep(s.id, draft)).length === 0);

  if (!ready) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-label="Loading" />;

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      {/* Laptop: step list. Phone: progress bar. */}
      <aside className="hidden lg:block">
        <ol className="sticky top-24 space-y-1">
          {STEPS.map((s, i) => {
            const current = s.id === step;
            const done = i < index || (Object.keys(validateStep(s.id, draft)).length === 0 && s.id !== 'review');
            const canGo = reachable(i);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!canGo}
                  onClick={() => go(s.id)}
                  aria-current={current ? 'step' : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    current ? 'bg-surface font-semibold shadow-sm' : 'text-muted hover:bg-surface-2'
                  }`}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                      current ? 'bg-brand text-on-brand' : done ? 'bg-brand-soft text-brand' : 'bg-surface-2'
                    }`}
                  >
                    {done && !current ? '✓' : i + 1}
                  </span>
                  {s.title}
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <div className="min-w-0">
        <div className="mb-5 lg:hidden">
          <div className="mb-2 flex justify-between text-sm text-muted">
            <span>
              Step {index + 1} of {STEPS.length}
            </span>
            <span>{meta.title}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
          <p className="mt-1 text-muted">{meta.blurb}</p>
          <div className="mt-6 space-y-7">
            {step === 'body' && <BodyStep d={draft} set={set} e={errors} />}
            {step === 'activity' && <ActivityStep d={draft} set={set} e={errors} />}
            {step === 'goal' && <GoalStep d={draft} set={set} e={errors} />}
            {step === 'health' && <HealthStep d={draft} set={set} />}
            {step === 'food' && <FoodStep d={draft} set={set} e={errors} />}
            {step === 'review' && <ReviewStep d={draft} go={go} />}
          </div>
          {showErrors && Object.keys(errors).length > 0 ? (
            <div className="mt-6">
              <Notice tone="danger">Please fix the highlighted answers to continue.</Notice>
            </div>
          ) : null}
        </section>

        {/* Phone: buttons stay within thumb reach. Laptop: inline under the form. */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-bg/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-5xl gap-3 lg:justify-end">
            <button
              type="button"
              onClick={() => go(STEPS[index - 1]!.id)}
              disabled={index === 0}
              className="h-12 flex-1 rounded-xl border border-border bg-surface px-6 font-medium disabled:opacity-40 lg:flex-none"
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              className="h-12 flex-[2] rounded-xl bg-brand px-8 font-semibold text-on-brand hover:bg-brand-strong lg:flex-none"
            >
              {step === 'review' ? 'Calculate my targets' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StepProps {
  d: AssessmentDraft;
  set: (patch: Partial<AssessmentDraft>) => void;
  e: StepErrors;
}

function BodyStep({ d, set, e }: StepProps) {
  return (
    <>
      <Fieldset legend="Sex used for calculations" hint="Energy formulas differ by sex. Choose the one that best matches your body." error={e.sex}>
        <ChoiceGroup
          name="sex"
          columns={2}
          value={d.sex}
          onChange={(sex) => set({ sex })}
          options={[
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
          ]}
        />
      </Fieldset>
      <div className="grid gap-5 sm:grid-cols-3">
        <NumberField label="Age" unit="years" inputMode="numeric" step="1" value={d.ageYears} onChange={(ageYears) => set({ ageYears })} error={e.ageYears} />
        <NumberField label="Height" unit="cm" value={d.heightCm} onChange={(heightCm) => set({ heightCm })} error={e.heightCm} />
        <NumberField label="Weight" unit="kg" value={d.weightKg} onChange={(weightKg) => set({ weightKg })} error={e.weightKg} />
      </div>
      <YesNo
        label="I know my body fat percentage"
        hint="Optional. Only used alongside the standard formula, never instead of it."
        value={d.knowsBodyFat}
        onChange={(knowsBodyFat) => set({ knowsBodyFat })}
      />
      {d.knowsBodyFat ? (
        <div className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
          <NumberField label="Body fat" unit="%" value={d.bodyFatPct} onChange={(bodyFatPct) => set({ bodyFatPct })} error={e.bodyFatPct} />
          <Fieldset legend="How was it measured?" error={e.bodyFatSource}>
            <ChoiceGroup name="bfsource" value={d.bodyFatSource} options={BODY_FAT_SOURCES} onChange={(bodyFatSource) => set({ bodyFatSource })} />
          </Fieldset>
        </div>
      ) : null}
    </>
  );
}

function ActivityStep({ d, set, e }: StepProps) {
  return (
    <>
      <Fieldset legend="Your usual day" hint="Outside of workouts." error={e.occupation}>
        <ChoiceGroup name="occupation" columns={1} value={d.occupation} options={OCCUPATIONS} onChange={(occupation) => set({ occupation })} />
      </Fieldset>
      <NumberField
        label="Average daily steps"
        hint="Optional, from your phone or watch. More accurate than the question above."
        unit="steps"
        inputMode="numeric"
        step="1"
        placeholder="e.g. 7000"
        value={d.avgDailySteps}
        onChange={(avgDailySteps) => set({ avgDailySteps })}
        error={e.avgDailySteps}
      />
      <Fieldset legend="Training days per week" hint="Gym, sport, yoga, running." error={e.trainingDaysPerWeek}>
        <ChoiceGroup
          name="training"
          columns={4}
          value={d.trainingDaysPerWeek}
          onChange={(trainingDaysPerWeek) => set({ trainingDaysPerWeek })}
          options={[0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: String(n) }))}
        />
      </Fieldset>
      {(d.trainingDaysPerWeek ?? 0) > 0 ? (
        <NumberField
          label="Typical session length"
          unit="min"
          inputMode="numeric"
          step="5"
          value={d.sessionMinutes}
          onChange={(sessionMinutes) => set({ sessionMinutes })}
          error={e.sessionMinutes}
        />
      ) : null}
      <Fieldset legend="Training experience" error={e.experience}>
        <ChoiceGroup name="experience" value={d.experience} options={EXPERIENCE} onChange={(experience) => set({ experience })} />
      </Fieldset>
    </>
  );
}

function GoalStep({ d, set, e }: StepProps) {
  return (
    <>
      <Fieldset legend="Main goal" error={e.goal}>
        <div className="sm:[&>div]:grid-cols-2">
          <ChoiceGroup name="goal" value={d.goal} options={GOALS} onChange={(goal) => set({ goal })} />
        </div>
      </Fieldset>
      {d.goal === 'fat_loss' ? (
        <Fieldset legend="Pace" hint="Slower keeps more muscle and is easier to stick with." error={e.weeklyRatePct}>
          <div className="sm:[&>div]:grid-cols-2">
            <ChoiceGroup name="pace" value={d.weeklyRatePct} options={FAT_LOSS_PACE} onChange={(weeklyRatePct) => set({ weeklyRatePct })} />
          </div>
        </Fieldset>
      ) : null}
    </>
  );
}

function HealthStep({ d, set }: Omit<StepProps, 'e'>) {
  return (
    <>
      <Notice>
        Tick anything that applies. Some answers mean we won&apos;t suggest eating less, or will ask you to check the targets with your
        doctor first.
      </Notice>
      {d.sex === 'female' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <YesNo label="I am pregnant" value={d.pregnant} onChange={(pregnant) => set({ pregnant })} />
          <YesNo label="I am breastfeeding" value={d.breastfeeding} onChange={(breastfeeding) => set({ breastfeeding })} />
        </div>
      ) : null}
      <YesNo
        label="I have had an eating disorder"
        hint="Now or in the past."
        value={d.eatingDisorderHistory}
        onChange={(eatingDisorderHistory) => set({ eatingDisorderHistory })}
      />
      <YesNo
        label="I take medicine that affects weight or appetite"
        hint="For example steroids, some antidepressants, or weight-loss injections."
        value={d.weightAffectingMedication}
        onChange={(weightAffectingMedication) => set({ weightAffectingMedication })}
      />
      <Fieldset legend="Health conditions" hint="Optional.">
        <CheckGroup columns={2} value={d.conditions ?? []} options={CONDITIONS} onChange={(conditions) => set({ conditions })} />
      </Fieldset>
    </>
  );
}

function FoodStep({ d, set, e }: StepProps) {
  return (
    <>
      <Fieldset legend="How do you eat?" error={e.dietType}>
        <div className="sm:[&>div]:grid-cols-2">
          <ChoiceGroup name="diet" value={d.dietType} options={DIET_TYPES} onChange={(dietType) => set({ dietType })} />
        </div>
      </Fieldset>
      <Fieldset legend="Allergies" hint="We leave these out of your diet plan.">
        <CheckGroup columns={3} value={d.allergies ?? []} options={ALLERGENS} onChange={(allergies) => set({ allergies })} />
      </Fieldset>
      <Fieldset legend="Meals a day" hint="Including snacks." error={e.mealsPerDay}>
        <ChoiceGroup
          name="meals"
          columns={3}
          value={d.mealsPerDay}
          onChange={(mealsPerDay) => set({ mealsPerDay })}
          options={[
            { value: 3 as const, label: '3' },
            { value: 4 as const, label: '4' },
            { value: 5 as const, label: '5' },
          ]}
        />
      </Fieldset>
    </>
  );
}

function ReviewStep({ d, go }: { d: AssessmentDraft; go: (s: StepId) => void }) {
  const yes = (b: boolean | undefined) => (b ? 'Yes' : 'No');
  const sections: Array<{ step: StepId; title: string; rows: Array<[string, string]> }> = [
    {
      step: 'body',
      title: 'About you',
      rows: [
        ['Sex', d.sex === 'male' ? 'Male' : d.sex === 'female' ? 'Female' : 'Not answered'],
        ['Age', d.ageYears !== undefined ? `${d.ageYears} years` : 'Not answered'],
        ['Height', d.heightCm !== undefined ? `${d.heightCm} cm` : 'Not answered'],
        ['Weight', d.weightKg !== undefined ? `${d.weightKg} kg` : 'Not answered'],
        ...(d.knowsBodyFat ? ([['Body fat', `${d.bodyFatPct ?? '?'}% (${labelOf(BODY_FAT_SOURCES, d.bodyFatSource)})`]] as Array<[string, string]>) : []),
      ],
    },
    {
      step: 'activity',
      title: 'Activity',
      rows: [
        ['Usual day', labelOf(OCCUPATIONS, d.occupation)],
        ['Daily steps', d.avgDailySteps !== undefined ? d.avgDailySteps.toLocaleString('en-IN') : 'Not given'],
        [
          'Training',
          d.trainingDaysPerWeek ? `${d.trainingDaysPerWeek} days a week, ${d.sessionMinutes ?? '?'} min` : 'None',
        ],
        ['Experience', labelOf(EXPERIENCE, d.experience)],
      ],
    },
    {
      step: 'goal',
      title: 'Goal',
      rows: [
        ['Goal', labelOf(GOALS, d.goal)],
        ...(d.goal === 'fat_loss' ? ([['Pace', labelOf(FAT_LOSS_PACE, d.weeklyRatePct)]] as Array<[string, string]>) : []),
      ],
    },
    {
      step: 'health',
      title: 'Health check',
      rows: [
        ...(d.sex === 'female'
          ? ([
              ['Pregnant', yes(d.pregnant)],
              ['Breastfeeding', yes(d.breastfeeding)],
            ] as Array<[string, string]>)
          : []),
        ['Eating disorder history', yes(d.eatingDisorderHistory)],
        ['Weight-affecting medicine', yes(d.weightAffectingMedication)],
        ['Conditions', d.conditions?.length ? d.conditions.map((c) => labelOf(CONDITIONS, c)).join(', ') : 'None'],
      ],
    },
    {
      step: 'food',
      title: 'Food',
      rows: [
        ['Diet', labelOf(DIET_TYPES, d.dietType)],
        ['Allergies', d.allergies?.length ? d.allergies.map((a) => labelOf(ALLERGENS, a)).join(', ') : 'None'],
        ['Meals a day', d.mealsPerDay ? String(d.mealsPerDay) : 'Not answered'],
      ],
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sections.map((s) => (
        <div key={s.step} className="rounded-xl border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">{s.title}</h2>
            <button type="button" onClick={() => go(s.step)} className="rounded-lg px-2 py-1 text-sm font-medium text-brand hover:bg-brand-soft">
              Edit
            </button>
          </div>
          <dl className="space-y-1 text-sm">
            {s.rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
