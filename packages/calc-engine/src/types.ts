export type SexForCalculation = 'male' | 'female';

export type Goal =
  | 'fat_loss'
  | 'recomposition'
  | 'lean_gain'
  | 'weight_gain'
  | 'maintenance'
  | 'strength'
  | 'endurance';

export type Occupation = 'sedentary' | 'light' | 'moderate' | 'heavy';

export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';

/** Where a measurement came from. Only measured values unlock formulas that depend on them. */
export type MeasurementSource =
  | 'measured_device'
  | 'measured_manual'
  | 'professional'
  | 'user_estimate'
  | 'ai_estimate'
  | 'wearable_sync';

export type RiskLevel = 'clear' | 'caution' | 'refer';

export interface Message {
  /** Stable machine-readable code, for UI copy and AI explanations. */
  code: string;
  /** Plain-language default text. */
  message: string;
}

export interface Range {
  min: number;
  max: number;
}
