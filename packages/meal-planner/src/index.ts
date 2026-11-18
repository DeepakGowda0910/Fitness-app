export { DISHES, type Dish, type DishIngredient, type MealSlot } from './dishes.js';
export { adaptDish, allergensOf, dietLevel, isJainExcluded, type Allergen, type DietType } from './classify.js';
export {
  generateWeekPlan,
  PlanError,
  PLANNER_VERSION,
  type PlanRequest,
  type PlannedItem,
  type PlannedMeal,
  type PlannedDay,
  type WeekPlan,
} from './planner.js';
