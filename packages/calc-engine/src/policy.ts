/**
 * Policy values for the calculation engine.
 *
 * These are proposed defaults from widely used sports-nutrition guidance
 * (see docs/calc-engine.md). They are kept in one place so a registered
 * dietitian can review and tune them without touching the formulas.
 *
 * Any change to a value here MUST bump POLICY_VERSION, so that every stored
 * target keeps the version that produced it.
 */

import type { Goal } from './types.js';

export const POLICY_VERSION = '2026.11.1';

export interface GoalPolicy {
  /** Protein in g per kg of reference weight: the default used, and the guidance range. */
  proteinPerKg: { default: number; min: number; max: number };
  /** Default share of calories from fat. */
  fatPct: number;
}

export const policy = {
  energy: {
    /** kcal per kg of body-weight change, used to turn a weekly rate into a daily deficit/surplus. */
    kcalPerKgBodyWeight: 7700,
    /** TDEE estimates carry this relative uncertainty band (±). */
    tdeeUncertaintyPct: 0.1,
    activityFactor: { min: 1.2, max: 1.9 },
    /** Non-exercise activity factor by occupation, used when no step count is known. */
    occupationFactor: {
      sedentary: 1.2,
      light: 1.3,
      moderate: 1.4,
      heavy: 1.55,
    },
    /** Non-exercise activity factor by average daily steps (upper bound exclusive). */
    stepsFactor: [
      { below: 5000, factor: 1.2 },
      { below: 7500, factor: 1.3 },
      { below: 10000, factor: 1.4 },
      { below: 12500, factor: 1.5 },
      { below: Infinity, factor: 1.6 },
    ],
    /** Added to the activity factor per training day, scaled by session length / 60 min. */
    perTrainingDayPerHour: 0.05,
    /** Session length assumed when the user does not give one. */
    defaultSessionMinutes: 60,
  },

  goals: {
    fat_loss: { proteinPerKg: { default: 2.0, min: 1.8, max: 2.2 }, fatPct: 0.25 },
    recomposition: { proteinPerKg: { default: 2.1, min: 2.0, max: 2.2 }, fatPct: 0.27 },
    lean_gain: { proteinPerKg: { default: 1.8, min: 1.6, max: 2.2 }, fatPct: 0.27 },
    weight_gain: { proteinPerKg: { default: 1.6, min: 1.4, max: 1.8 }, fatPct: 0.3 },
    maintenance: { proteinPerKg: { default: 1.6, min: 1.4, max: 1.8 }, fatPct: 0.3 },
    strength: { proteinPerKg: { default: 1.8, min: 1.6, max: 2.0 }, fatPct: 0.27 },
    endurance: { proteinPerKg: { default: 1.6, min: 1.4, max: 1.8 }, fatPct: 0.25 },
  } satisfies Record<Goal, GoalPolicy>,

  fatLoss: {
    /** Weekly loss as % of body weight. */
    defaultWeeklyRatePct: 0.5,
    /** Above this rate the plan is flagged as aggressive. */
    aggressiveWeeklyRatePct: 0.75,
    maxWeeklyRatePct: 1.0,
    /** Deficit never exceeds this share of TDEE. */
    maxDeficitPctOfTdee: 0.25,
  },
  recomposition: { calorieMultiplier: 0.95 },
  leanGain: {
    surplusPctByExperience: { beginner: 0.1, intermediate: 0.075, advanced: 0.05 },
  },
  weightGain: { surplusKcal: 400 },
  strength: { calorieMultiplier: 1.025 },

  macros: {
    minFatPct: 0.2,
    minFatPerKg: 0.6,
    lowCarbWarningG: 130,
    fibrePer1000Kcal: 14,
    kcalPerG: { protein: 4, carbs: 4, fat: 9 },
  },

  water: {
    mlPerKg: 35,
    perTrainingHourMl: { min: 500, max: 750 },
  },

  safety: {
    /** Absolute calorie floors without professional supervision. */
    calorieFloor: { female: 1200, male: 1500 },
    adultAge: 18,
    underweightBmi: 18.5,
    /** BMI at or above which protein uses the weight at BMI 25 as reference. */
    referenceWeightBmiThreshold: 30,
    referenceBmi: 25,
  },

  /** Weekly-rate bands for goal feasibility, as % of body weight per week. */
  feasibility: {
    loss: { realistic: 0.75, ambitious: 1.0 },
    gain: { realistic: 0.35, ambitious: 0.5 },
    /** Rate used to suggest a realistic date. */
    suggestedLossRatePct: 0.5,
    suggestedGainRatePct: 0.25,
  },

  /** Weekly check-in and adaptive targets. */
  adaptive: {
    /** EMA smoothing per day for trend weight (0.1 ≈ Hacker's Diet). */
    trendAlphaPerDay: 0.1,
    adherence: { minDietAdherencePct: 80, minDaysLogged: 4 },
    /** 1–5 scales. A week is "poor recovery" when any of these is met. */
    recovery: { hungerAtLeast: 4, energyAtMost: 2, sleepQualityAtMost: 2, consecutiveWeeks: 2 },
    /** Goal target weekly rate (% body weight). Fat loss uses the user's chosen rate. */
    targetWeeklyRatePct: {
      lean_gain: 0.25,
      weight_gain: 0.35,
    },
    /** Goals aiming at stable weight: trend within ± this band counts as maintaining. */
    maintainingBandPct: 0.25,
    /** Actual/target ratio bands for loss and gain goals. */
    fasterAbove: 1.5,
    slowerBelow: 0.5,
    /** Plateau: under this share of the target rate for N weeks with good adherence. */
    plateau: { belowRatio: 0.25, weeks: 3 },
    /** Calorie change limits per week (kcal/day). */
    change: { min: 50, max: 150, roundTo: 10 },
    /** Weeks of good logging needed before observed TDEE is reported. */
    observedTdeeMinWeeks: 3,
    /** Cycle-aware: compare over this many weeks instead of one. */
    cycleAwareWeeks: 4,
  },

  /** Calories are rounded to this step before macros are derived. */
  calorieRoundingKcal: 10,
} as const;

export type Policy = typeof policy;
