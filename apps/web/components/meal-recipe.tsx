'use client';

import { formatAmount, recipeFor, type DietType, type PlannedMeal, type RecipePart } from '@fitness/meal-planner';

/**
 * "How to make it": a fold-out recipe under a meal's ingredients. Every amount
 * comes from the planned meal itself, so it always matches the numbers above.
 */
export function MealRecipe({ meal, dietType }: { meal: PlannedMeal; dietType: DietType | undefined }) {
  const recipe = recipeFor(meal, dietType);
  if (!recipe) return null;
  const total = recipe.prepMin + recipe.cookMin;

  return (
    <details className="recipe group mt-3 rounded-xl border border-border bg-surface/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand hover:bg-brand-soft [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 3h9l3 3v11H4z M7 8h6 M7 11h6 M7 14h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          How to make it
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-muted">
          {total} min
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 transition-transform group-open:rotate-180" fill="currentColor">
            <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
          </svg>
        </span>
      </summary>

      <div className="space-y-3 px-3 pb-3 pt-1 text-sm">
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <div className="flex gap-1">
            <dt>Prep</dt>
            <dd className="font-semibold text-text">{recipe.prepMin} min</dd>
          </div>
          <div className="flex gap-1">
            <dt>Cook</dt>
            <dd className="font-semibold text-text">{recipe.cookMin > 0 ? `${recipe.cookMin} min` : 'none'}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Serves</dt>
            <dd className="font-semibold text-text">1 (you)</dd>
          </div>
          <div className="flex gap-1">
            <dt>Method</dt>
            <dd className="font-semibold text-text">{recipe.method}</dd>
          </div>
        </dl>

        <p className="text-xs italic text-muted">
          This recipe is just a suggestion. Feel free to cook it your own way, as long as you use the ingredients and amounts listed above.
        </p>

        {recipe.ahead ? <p className="rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs">⏰ Plan ahead: {recipe.ahead}.</p> : null}

        <ol className="space-y-2">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-on-brand">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step.map(renderPart)}</span>
            </li>
          ))}
        </ol>

        {recipe.pantry.length > 0 ? (
          <p className="text-xs text-muted">
            <span className="font-semibold text-text">From your kitchen: </span>
            {recipe.pantry.join(', ')}. These add very few calories and are not counted above.
          </p>
        ) : null}

        <p className="rounded-lg bg-brand-soft px-2.5 py-2 text-xs">
          <span className="font-semibold">Healthy tip: </span>
          {recipe.tip}
        </p>
      </div>
    </details>
  );
}

function renderPart(part: RecipePart, i: number) {
  if (typeof part === 'string') return <span key={i}>{part}</span>;
  return (
    <strong key={i} className="font-semibold">
      {formatAmount(part)}
    </strong>
  );
}
