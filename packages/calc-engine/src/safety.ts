import { bmi } from './energy.js';
import { policy } from './policy.js';
import type { Message, RiskLevel } from './types.js';

export type HealthCondition =
  | 'diabetes_insulin'
  | 'diabetes_sulfonylurea'
  | 'diabetes_other'
  | 'kidney_disease'
  | 'heart_disease'
  | 'thyroid'
  | 'other';

export interface ScreeningInput {
  ageYears: number;
  weightKg: number;
  heightCm: number;
  pregnant?: boolean | undefined;
  breastfeeding?: boolean | undefined;
  eatingDisorderHistory?: boolean | undefined;
  conditions?: readonly HealthCondition[] | undefined;
  /** Takes medication known to affect weight or appetite. */
  weightAffectingMedication?: boolean | undefined;
}

export interface ScreeningResult {
  riskLevel: RiskLevel;
  /** Codes of every rule that fired. */
  flags: string[];
  /** False means the engine must not set a calorie deficit. */
  allowDeficit: boolean;
  /** Targets may be shown but must carry a "review with your doctor" gate before they apply. */
  requiresDoctorReview: boolean;
  messages: Message[];
}

/** Conditions that need a doctor's review before targets apply. */
const DOCTOR_REVIEW_CONDITIONS: ReadonlySet<HealthCondition> = new Set([
  'diabetes_insulin',
  'diabetes_sulfonylurea',
  'kidney_disease',
  'heart_disease',
]);

/**
 * Safety screening. Runs before any target is computed or shown.
 *
 * - refer: minors, pregnancy, breastfeeding, eating-disorder history, BMI < 18.5.
 *   No deficit; maintenance guidance and a referral message.
 * - caution: conditions or medication that change how targets should be applied.
 * - clear: none of the above.
 */
export function screen(input: ScreeningInput): ScreeningResult {
  const s = policy.safety;
  const flags: string[] = [];
  const messages: Message[] = [];
  let refer = false;
  let requiresDoctorReview = false;

  const referRule = (code: string, message: string) => {
    refer = true;
    flags.push(code);
    messages.push({ code, message });
  };

  if (input.ageYears < s.adultAge) {
    referRule(
      'minor',
      'Calorie targets for people under 18 should come from a doctor or registered dietitian. We will show general guidance only.',
    );
  }
  if (input.pregnant) {
    referRule('pregnant', 'During pregnancy, please follow your doctor’s nutrition advice. We will not set a calorie deficit.');
  }
  if (input.breastfeeding) {
    referRule(
      'breastfeeding',
      'While breastfeeding, energy needs are higher. Please check targets with your doctor. We will not set a calorie deficit.',
    );
  }
  if (input.eatingDisorderHistory) {
    referRule(
      'eating_disorder_history',
      'Because of a history of disordered eating, we will not set a calorie deficit. A doctor or dietitian can help plan safely.',
    );
  }
  const userBmi = bmi(input.weightKg, input.heightCm);
  if (userBmi < s.underweightBmi) {
    referRule('underweight', 'Your BMI is below 18.5, so we will not set a calorie deficit. Please speak to a doctor.');
  }

  for (const c of input.conditions ?? []) {
    if (DOCTOR_REVIEW_CONDITIONS.has(c)) {
      requiresDoctorReview = true;
      flags.push(`condition_${c}`);
    } else {
      flags.push(`condition_${c}`);
    }
  }
  if (input.weightAffectingMedication) {
    requiresDoctorReview = true;
    flags.push('weight_affecting_medication');
  }
  if (requiresDoctorReview) {
    messages.push({
      code: 'doctor_review',
      message: 'Because of your health conditions or medication, please review these targets with your doctor before you start.',
    });
  }

  const riskLevel: RiskLevel = refer ? 'refer' : flags.length > 0 ? 'caution' : 'clear';
  return { riskLevel, flags, allowDeficit: !refer, requiresDoctorReview, messages };
}
