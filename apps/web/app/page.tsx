import { computeTargets } from '@fitness/calc-engine';
import Link from 'next/link';

/** Worked out by the real engine at build time, so the example never drifts from it. */
const EXAMPLE = computeTargets({
  sex: 'male',
  ageYears: 30,
  heightCm: 175,
  weightKg: 80,
  activity: { occupation: 'sedentary', avgDailySteps: 7000, trainingDaysPerWeek: 3, sessionMinutes: 60 },
  goal: 'fat_loss',
  weeklyRatePct: 0.5,
});
const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

const FEATURES = [
  { title: 'Targets from proven formulas', body: 'Calories, protein, carbs, fat, fibre and water from standard equations. No guesswork.' },
  { title: 'Indian meals', body: 'Diet plans built from Indian foods and the IFCT 2017 nutrition tables, for veg, egg, non-veg and Jain diets.' },
  { title: 'Workouts that progress', body: 'A weekly plan for the gym, dumbbells at home or no equipment. Log your sets and it tells you when to add weight.' },
  { title: 'Adjusts every week', body: 'Weekly check-ins compare your weight trend with your goal and change the targets only when needed.' },
  { title: 'Safety first', body: 'Health questions decide when we won’t suggest eating less, and when to check with your doctor.' },
];

export default function Home() {
  return (
    <div className="space-y-12 lg:space-y-16">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Know exactly what to eat for your goal.</h1>
          <p className="mt-4 max-w-prose text-lg text-muted">
            Answer a few questions and get daily calorie and macro targets worked out from your body, activity and goal. Takes about three
            minutes.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/assessment"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong"
            >
              Start the assessment
            </Link>
            <Link
              href="/results"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-surface px-6 font-medium hover:bg-surface-2"
            >
              See my targets
            </Link>
          </div>
        </div>
        <div className="tint tint-2 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-sm text-muted">Example: man, 30, 175 cm, 80 kg, 7,000 steps a day, training 3 times a week, losing fat steadily</p>
          <p className="mt-2 text-4xl font-semibold">
            {fmt(EXAMPLE.calories)} <span className="text-lg font-medium text-muted">kcal/day</span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-protein-soft p-3">
              <p className="text-muted">Protein</p>
              <p className="text-lg font-semibold">{fmt(EXAMPLE.proteinG)} g</p>
            </div>
            <div className="rounded-xl bg-carbs-soft p-3">
              <p className="text-muted">Carbs</p>
              <p className="text-lg font-semibold">{fmt(EXAMPLE.carbsG)} g</p>
            </div>
            <div className="rounded-xl bg-fat-soft p-3">
              <p className="text-muted">Fat</p>
              <p className="text-lg font-semibold">{fmt(EXAMPLE.fatG)} g</p>
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div key={f.title} className={`tint tint-${(i % 4) + 1} rounded-2xl border border-border bg-surface p-5`}>
            <h2 className="font-bold">{f.title}</h2>
            <p className="mt-2 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
