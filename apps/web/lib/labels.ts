import type { Allergen, DietType } from '@fitness/meal-planner';
import type { BodyFatSource, Equipment, Experience, Goal, HealthCondition, Occupation } from './assessment';

export const OCCUPATIONS: Array<{ value: Occupation; label: string; hint: string }> = [
  { value: 'sedentary', label: 'Mostly sitting', hint: 'Desk job, studying, driving' },
  { value: 'light', label: 'On my feet some of the day', hint: 'Teaching, retail, light housework' },
  { value: 'moderate', label: 'On my feet most of the day', hint: 'Nursing, waiting tables, delivery on foot' },
  { value: 'heavy', label: 'Physical work', hint: 'Construction, farming, loading' },
];

export const EXPERIENCE: Array<{ value: Experience; label: string; hint: string }> = [
  { value: 'beginner', label: 'New to training', hint: 'Less than a year' },
  { value: 'intermediate', label: 'Some experience', hint: '1 to 3 years' },
  { value: 'advanced', label: 'Experienced', hint: 'More than 3 years' },
];

export const EQUIPMENT: Array<{ value: Equipment; label: string; hint: string }> = [
  { value: 'gym', label: 'At a gym', hint: 'Machines, barbells and dumbbells' },
  { value: 'dumbbells', label: 'At home with dumbbells', hint: 'A pair of dumbbells, maybe a bench' },
  { value: 'bodyweight', label: 'At home, no equipment', hint: 'Bodyweight, a chair and a backpack' },
];

export const GOALS: Array<{ value: Goal; label: string; hint: string }> = [
  { value: 'fat_loss', label: 'Lose fat', hint: 'Eat a little less, keep muscle' },
  { value: 'recomposition', label: 'Lose fat and build muscle', hint: 'Small deficit with strength training' },
  { value: 'lean_gain', label: 'Build muscle', hint: 'Small surplus, slow and lean' },
  { value: 'weight_gain', label: 'Gain weight', hint: 'Larger surplus' },
  { value: 'maintenance', label: 'Stay where I am', hint: 'Eat to maintain' },
  { value: 'strength', label: 'Get stronger', hint: 'Fuel heavy training' },
  { value: 'endurance', label: 'Endurance', hint: 'Running, cycling, sport' },
];

export const FAT_LOSS_PACE: Array<{ value: number; label: string; hint: string }> = [
  { value: 0.25, label: 'Gentle', hint: 'About 0.25% of body weight a week' },
  { value: 0.5, label: 'Steady', hint: 'About 0.5% a week. Recommended' },
  { value: 0.75, label: 'Faster', hint: 'About 0.75% a week' },
  { value: 1.0, label: 'Fastest', hint: 'About 1% a week. Harder to keep up' },
];

export const BODY_FAT_SOURCES: Array<{ value: BodyFatSource; label: string }> = [
  { value: 'professional', label: 'DEXA scan or a professional' },
  { value: 'measured_device', label: 'Smart scale or body-fat device' },
  { value: 'user_estimate', label: 'My own estimate' },
];

export const CONDITIONS: Array<{ value: HealthCondition; label: string }> = [
  { value: 'diabetes_insulin', label: 'Diabetes, on insulin' },
  { value: 'diabetes_sulfonylurea', label: 'Diabetes, on tablets like glimepiride or gliclazide' },
  { value: 'diabetes_other', label: 'Diabetes, other treatment' },
  { value: 'kidney_disease', label: 'Kidney disease' },
  { value: 'heart_disease', label: 'Heart disease' },
  { value: 'thyroid', label: 'Thyroid condition' },
  { value: 'other', label: 'Another long-term condition' },
];

export const DIET_TYPES: Array<{ value: DietType; label: string; hint: string }> = [
  { value: 'vegetarian', label: 'Vegetarian', hint: 'Milk and curd, no egg, meat or fish' },
  { value: 'eggetarian', label: 'Eggetarian', hint: 'Vegetarian plus eggs' },
  { value: 'non_vegetarian', label: 'Non-vegetarian', hint: 'Everything' },
  { value: 'pescatarian', label: 'Pescatarian', hint: 'Vegetarian plus eggs and fish' },
  { value: 'jain', label: 'Jain', hint: 'No onion, garlic or root vegetables' },
  { value: 'vegan', label: 'Vegan', hint: 'No animal foods' },
];

export const ALLERGENS: Array<{ value: Allergen; label: string }> = [
  { value: 'dairy', label: 'Milk' },
  { value: 'gluten', label: 'Gluten (wheat)' },
  { value: 'peanut', label: 'Peanut' },
  { value: 'tree_nut', label: 'Tree nuts' },
  { value: 'soy', label: 'Soy' },
  { value: 'egg', label: 'Egg' },
  { value: 'fish', label: 'Fish' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'sesame', label: 'Sesame' },
];

export function labelOf<T>(list: ReadonlyArray<{ value: T; label: string }>, value: T | undefined): string {
  return list.find((o) => o.value === value)?.label ?? 'Not answered';
}
