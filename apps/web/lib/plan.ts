import type { NutritionTargets } from '@fitness/calc-engine';
import type { DayTargets, NutrientTotals, ToleranceCheck } from '@fitness/calc-engine';
import type { PlanRequest } from '@fitness/meal-planner';
import type { AssessmentDraft } from './assessment';

/** Choices the user makes on the plan screen. */
export interface PlanSettings {
  variant: number;
  excludeDishIds: string[];
}

export const DEFAULT_PLAN_SETTINGS: PlanSettings = { variant: 0, excludeDishIds: [] };

export function dayTargetsOf(t: NutritionTargets): DayTargets {
  return { calories: t.calories, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG, fibreG: t.fibreG };
}

/** Today's date in the user's time zone, YYYY-MM-DD. */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function planRequestOf(
  targets: NutritionTargets,
  draft: AssessmentDraft,
  settings: PlanSettings,
  startDate: string,
): PlanRequest {
  return {
    targets: dayTargetsOf(targets),
    dietType: draft.dietType ?? 'vegetarian',
    allergies: draft.allergies ?? [],
    excludeDishIds: settings.excludeDishIds,
    mealsPerDay: draft.mealsPerDay ?? 3,
    startDate,
    variant: settings.variant,
  };
}

export interface NutrientRow {
  key: keyof NutrientTotals;
  label: string;
  unit: string;
  value: number;
  target: number;
  ok: boolean;
  /** How the target is read: within a band, or a minimum. */
  kind: 'band' | 'min';
}

/** The day's totals against targets, in display order. */
export function nutrientRows(totals: NutrientTotals, targets: DayTargets, checks: ToleranceCheck): NutrientRow[] {
  return [
    { key: 'calories', label: 'Calories', unit: 'kcal', value: totals.calories, target: targets.calories, ok: checks.calories, kind: 'band' },
    { key: 'proteinG', label: 'Protein', unit: 'g', value: totals.proteinG, target: targets.proteinG, ok: checks.protein, kind: 'min' },
    { key: 'carbsG', label: 'Carbs', unit: 'g', value: totals.carbsG, target: targets.carbsG, ok: checks.carbs, kind: 'band' },
    { key: 'fatG', label: 'Fat', unit: 'g', value: totals.fatG, target: targets.fatG, ok: checks.fat, kind: 'band' },
    { key: 'fibreG', label: 'Fibre', unit: 'g', value: totals.fibreG, target: targets.fibreG, ok: checks.fibre, kind: 'min' },
  ];
}

const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  mid_morning: 'Mid-morning',
  lunch: 'Lunch',
  evening: 'Evening snack',
  dinner: 'Dinner',
};

export function slotLabel(slot: string): string {
  return SLOT_LABELS[slot] ?? slot;
}
