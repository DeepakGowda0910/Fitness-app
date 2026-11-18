import { bmi, computeActivityFactor, computeBmr, computeTdee, type BmrResult, type TdeeResult } from './energy.js';
import { POLICY_VERSION, policy } from './policy.js';
import { screen, type ScreeningResult } from './safety.js';
import { targetsInputSchema, type TargetsInput, type ValidatedTargetsInput } from './schemas.js';
import type { Goal, Message, Range } from './types.js';
import { ENGINE_VERSION } from './version.js';

export interface NutritionTargets {
  engineVersion: string;
  policyVersion: string;
  /** The validated inputs, stored with the result so every number can be reproduced. */
  inputs: ValidatedTargetsInput;
  screening: ScreeningResult;
  requestedGoal: Goal;
  /** The goal actually used; differs from requestedGoal only when safety rules changed it. */
  appliedGoal: Goal;
  bmr: BmrResult;
  tdee: TdeeResult;
  calories: number;
  /** Positive = deficit, negative = surplus, relative to TDEE (kcal/day). */
  dailyDeficitKcal: number;
  referenceWeightKg: number;
  proteinG: number;
  /** Guidance range for protein from the goal policy. */
  proteinRangeG: Range;
  carbsG: number;
  fatG: number;
  fibreG: number;
  water: { baseMl: number; perTrainingHourMl: Range };
  assumptions: Message[];
  warnings: Message[];
}

const DEFICIT_GOALS: ReadonlySet<Goal> = new Set(['fat_loss', 'recomposition']);
const SURPLUS_GOALS: ReadonlySet<Goal> = new Set(['lean_gain', 'weight_gain']);

/**
 * Computes BMR, TDEE, calories, macros, fibre and water for one person.
 * Pure: same input, same output. Throws a ZodError on invalid input.
 */
export function computeTargets(rawInput: TargetsInput): NutritionTargets {
  const input = targetsInputSchema.parse(rawInput);
  const assumptions: Message[] = [];
  const warnings: Message[] = [];

  const screening = screen({
    ageYears: input.ageYears,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    ...input.screening,
  });

  const appliedGoal = resolveGoal(input.goal, screening);
  if (appliedGoal !== input.goal) {
    warnings.push({
      code: 'goal_changed_for_safety',
      message: 'Based on your health answers, we are showing maintenance targets instead of your chosen goal.',
    });
  }

  const bmr = computeBmr(input);
  if (bmr.katchMcArdle !== undefined && Math.abs(bmr.katchMcArdle - bmr.value) / bmr.value > 0.1) {
    assumptions.push({
      code: 'bmr_formulas_differ',
      message: `Your measured body fat gives a resting energy of ${bmr.katchMcArdle} kcal (Katch-McArdle), more than 10% away from the ${bmr.value} kcal we use (Mifflin-St Jeor). Your weekly check-ins will correct for this.`,
    });
  }
  if (input.ageYears < policy.safety.adultAge) {
    warnings.push({
      code: 'formula_not_validated_for_minors',
      message: 'The formulas used here are designed for adults; treat these numbers as rough guidance only.',
    });
  }

  const activity = computeActivityFactor(input.activity);
  assumptions.push(...activity.assumptions);
  const tdee = computeTdee(bmr.value, activity.factor);

  const calories = computeCalories(input, appliedGoal, bmr.value, tdee.value, warnings);

  const referenceWeightKg = referenceWeight(input.weightKg, input.heightCm);
  if (referenceWeightKg !== input.weightKg) {
    assumptions.push({
      code: 'reference_weight_bmi25',
      message: `Protein is based on ${referenceWeightKg} kg, the weight at BMI 25 for your height, so the target stays realistic.`,
    });
  }

  const goalPolicy = policy.goals[appliedGoal];
  const macros = computeMacros(calories, referenceWeightKg, goalPolicy.proteinPerKg.default, goalPolicy.fatPct, warnings);

  if (appliedGoal === 'recomposition' && input.activity.trainingDaysPerWeek === 0) {
    warnings.push({
      code: 'recomposition_needs_training',
      message: 'Body recomposition only works with regular resistance training. Consider fat loss or adding 2 to 4 strength sessions a week.',
    });
  }

  const fibreG = Math.round((policy.macros.fibrePer1000Kcal * calories) / 1000);
  const baseMl = roundTo(policy.water.mlPerKg * input.weightKg, 50);

  assumptions.push({
    code: 'estimate_not_measured',
    message: `These targets are estimates. Your real maintenance is likely between ${tdee.range.min} and ${tdee.range.max} kcal; weekly check-ins will refine it.`,
  });

  return {
    engineVersion: ENGINE_VERSION,
    policyVersion: POLICY_VERSION,
    inputs: input,
    screening,
    requestedGoal: input.goal,
    appliedGoal,
    bmr,
    tdee,
    calories,
    dailyDeficitKcal: tdee.value - calories,
    referenceWeightKg,
    proteinG: macros.proteinG,
    proteinRangeG: {
      min: Math.round(goalPolicy.proteinPerKg.min * referenceWeightKg),
      max: Math.round(goalPolicy.proteinPerKg.max * referenceWeightKg),
    },
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    fibreG,
    water: { baseMl, perTrainingHourMl: { ...policy.water.perTrainingHourMl } },
    assumptions,
    warnings,
  };
}

/**
 * Safety may override the goal. A "refer" outcome means maintenance, except
 * that an underweight adult may still choose a weight-gain goal.
 */
function resolveGoal(goal: Goal, screening: ScreeningResult): Goal {
  if (screening.allowDeficit) return goal;
  const onlyUnderweight = screening.flags.filter((f) => !f.startsWith('condition_') && f !== 'weight_affecting_medication');
  if (SURPLUS_GOALS.has(goal) && onlyUnderweight.length === 1 && onlyUnderweight[0] === 'underweight') {
    return goal;
  }
  return 'maintenance';
}

function computeCalories(
  input: ValidatedTargetsInput,
  goal: Goal,
  bmr: number,
  tdee: number,
  warnings: Message[],
): number {
  let calories: number;
  switch (goal) {
    case 'fat_loss': {
      const fl = policy.fatLoss;
      const rate = input.weeklyRatePct ?? fl.defaultWeeklyRatePct;
      if (rate > fl.aggressiveWeeklyRatePct) {
        warnings.push({
          code: 'aggressive_rate',
          message: `Losing ${rate}% of body weight a week is aggressive. It can cost muscle and energy; 0.5% to 0.75% is easier to sustain.`,
        });
      }
      const wanted = (input.weightKg * (rate / 100) * policy.energy.kcalPerKgBodyWeight) / 7;
      const cap = tdee * fl.maxDeficitPctOfTdee;
      if (wanted > cap) {
        warnings.push({
          code: 'deficit_capped',
          message: 'Your deficit was limited to 25% of your maintenance calories.',
        });
      }
      calories = tdee - Math.min(wanted, cap);
      break;
    }
    case 'recomposition':
      calories = tdee * policy.recomposition.calorieMultiplier;
      break;
    case 'lean_gain':
      calories = tdee * (1 + policy.leanGain.surplusPctByExperience[input.experience]);
      break;
    case 'weight_gain':
      calories = tdee + policy.weightGain.surplusKcal;
      break;
    case 'strength':
      calories = tdee * policy.strength.calorieMultiplier;
      break;
    case 'maintenance':
    case 'endurance':
      calories = tdee;
      break;
  }

  if (DEFICIT_GOALS.has(goal)) {
    const floor = Math.max(policy.safety.calorieFloor[input.sex], bmr);
    if (floor >= tdee) {
      warnings.push({
        code: 'deficit_not_possible',
        message: 'A calorie deficit would take you below the safe minimum for your size, so your target is set to maintenance. A dietitian can help you plan a supervised deficit.',
      });
      calories = tdee;
    } else if (calories < floor) {
      warnings.push({
        code: 'calorie_floor_applied',
        message: `Your target was raised to ${Math.round(floor)} kcal, the safe minimum without supervision.`,
      });
      calories = floor;
    }
    // Round up so rounding can never push a deficit below the floor.
    return Math.min(roundUpTo(calories, policy.calorieRoundingKcal), tdee);
  }
  return roundTo(calories, policy.calorieRoundingKcal);
}

/** Actual weight, or the weight at BMI 25 when BMI is 30 or above. */
export function referenceWeight(weightKg: number, heightCm: number): number {
  const s = policy.safety;
  if (bmi(weightKg, heightCm) < s.referenceWeightBmiThreshold) return weightKg;
  const m = heightCm / 100;
  return Math.round(s.referenceBmi * m * m * 10) / 10;
}

export interface Macros {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Protein from g/kg, fat from a share of calories (with minimums), carbs as the
 * remainder. 4·P + 4·C + 9·F always lands within a few kcal of `calories`.
 */
export function computeMacros(
  calories: number,
  referenceWeightKg: number,
  proteinPerKg: number,
  fatPct: number,
  warnings: Message[] = [],
): Macros {
  const m = policy.macros;
  const k = m.kcalPerG;

  let proteinG = Math.round(proteinPerKg * referenceWeightKg);
  const fatMinG = Math.ceil(Math.max(m.minFatPerKg * referenceWeightKg, (m.minFatPct * calories) / k.fat));
  let fatG = Math.max(Math.round((fatPct * calories) / k.fat), fatMinG);

  let remainder = calories - proteinG * k.protein - fatG * k.fat;
  if (remainder < 0) {
    fatG = fatMinG;
    remainder = calories - proteinG * k.protein - fatG * k.fat;
  }
  if (remainder < 0) {
    proteinG = Math.max(0, Math.floor((calories - fatG * k.fat) / k.protein));
    remainder = calories - proteinG * k.protein - fatG * k.fat;
    warnings.push({
      code: 'protein_reduced_to_fit',
      message: 'Protein was reduced so your macros fit within your calorie target.',
    });
  }
  const carbsG = Math.max(0, Math.round(remainder / k.carbs));

  if (carbsG < m.lowCarbWarningG) {
    warnings.push({
      code: 'low_carb',
      message: `Carbohydrate is below ${m.lowCarbWarningG} g a day, which can affect training and energy.`,
    });
  }
  return { proteinG, carbsG, fatG };
}

export function macroCalories(m: Macros): number {
  const k = policy.macros.kcalPerG;
  return m.proteinG * k.protein + m.carbsG * k.carbs + m.fatG * k.fat;
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function roundUpTo(n: number, step: number): number {
  return Math.ceil(n / step) * step;
}
