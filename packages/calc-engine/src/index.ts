export * from './types.js';
export { policy, POLICY_VERSION, type Policy, type GoalPolicy } from './policy.js';
export { ENGINE_VERSION, ENGINE_CODE_VERSION } from './version.js';
export * from './schemas.js';
export {
  mifflinStJeor,
  katchMcArdle,
  bmi,
  computeBmr,
  computeActivityFactor,
  computeTdee,
  type BmrResult,
  type ActivityInput,
  type ActivityResult,
  type TdeeResult,
} from './energy.js';
export { screen, type ScreeningInput, type ScreeningResult, type HealthCondition } from './safety.js';
export {
  computeTargets,
  computeMacros,
  macroCalories,
  referenceWeight,
  type NutritionTargets,
  type Macros,
} from './targets.js';
export { assessFeasibility, type Feasibility, type FeasibilityResult } from './feasibility.js';
