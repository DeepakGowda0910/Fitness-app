import { bmi } from './energy.js';
import { policy } from './policy.js';
import { feasibilityInputSchema, type FeasibilityInput } from './schemas.js';
import type { Message } from './types.js';

export type Feasibility = 'realistic' | 'ambitious' | 'unsafe';

export interface FeasibilityResult {
  feasibility: Feasibility;
  direction: 'loss' | 'gain' | 'none';
  weeks: number;
  /** Required change per week, as % of current body weight. */
  requiredWeeklyRatePct: number;
  /** A date that fits the suggested safe rate (YYYY-MM-DD); absent when the goal is already met. */
  suggestedTargetDate?: string;
  warnings: Message[];
}

const MS_PER_DAY = 86_400_000;

/**
 * Compares the weekly rate a goal needs with the safe bands and suggests a
 * realistic date. Pure: dates are parsed as UTC calendar days.
 */
export function assessFeasibility(rawInput: FeasibilityInput): FeasibilityResult {
  const input = feasibilityInputSchema.parse(rawInput);
  const f = policy.feasibility;
  const warnings: Message[] = [];

  const start = Date.parse(`${input.startDate}T00:00:00Z`);
  const end = Date.parse(`${input.targetDate}T00:00:00Z`);
  const days = Math.round((end - start) / MS_PER_DAY);
  const weeks = days / 7;

  const delta = input.targetWeightKg - input.currentWeightKg;
  const direction = delta < 0 ? 'loss' : delta > 0 ? 'gain' : 'none';

  if (bmi(input.targetWeightKg, input.heightCm) < policy.safety.underweightBmi) {
    warnings.push({
      code: 'target_underweight',
      message: 'This target weight is below a healthy BMI of 18.5 for your height.',
    });
    return { feasibility: 'unsafe', direction, weeks: round2(weeks), requiredWeeklyRatePct: 0, warnings };
  }

  if (direction === 'none') {
    return { feasibility: 'realistic', direction, weeks: round2(weeks), requiredWeeklyRatePct: 0, warnings };
  }

  if ((input.goal === 'fat_loss' && direction === 'gain') || (['lean_gain', 'weight_gain'].includes(input.goal) && direction === 'loss')) {
    warnings.push({
      code: 'goal_direction_mismatch',
      message: 'Your target weight moves in the opposite direction to your chosen goal.',
    });
  }

  const suggestedRate = direction === 'loss' ? f.suggestedLossRatePct : f.suggestedGainRatePct;
  const suggestedWeeks = Math.abs(delta) / (input.currentWeightKg * (suggestedRate / 100));
  const suggestedTargetDate = new Date(start + Math.ceil(suggestedWeeks * 7) * MS_PER_DAY).toISOString().slice(0, 10);

  if (days <= 0) {
    warnings.push({ code: 'target_date_not_in_future', message: 'The target date must be after the start date.' });
    return { feasibility: 'unsafe', direction, weeks: round2(weeks), requiredWeeklyRatePct: Infinity, suggestedTargetDate, warnings };
  }

  const requiredWeeklyRatePct = (Math.abs(delta) / input.currentWeightKg / weeks) * 100;
  const band = direction === 'loss' ? f.loss : f.gain;
  const feasibility: Feasibility =
    requiredWeeklyRatePct <= band.realistic ? 'realistic' : requiredWeeklyRatePct <= band.ambitious ? 'ambitious' : 'unsafe';

  if (feasibility !== 'realistic') {
    warnings.push({
      code: feasibility === 'unsafe' ? 'rate_unsafe' : 'rate_ambitious',
      message: `This needs about ${round2(requiredWeeklyRatePct)}% of body weight a week. A realistic date is ${suggestedTargetDate}.`,
    });
  }

  return {
    feasibility,
    direction,
    weeks: round2(weeks),
    requiredWeeklyRatePct: round2(requiredWeeklyRatePct),
    suggestedTargetDate,
    warnings,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
