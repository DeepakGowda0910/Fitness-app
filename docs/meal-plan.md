# 7-day diet plan

`@fitness/meal-planner` turns a day's targets into a week of Indian meals.
Every gram and every calorie comes from code; AI may later suggest dishes, but
never quantities or nutrition.

## How a plan is built

1. **Eligible dishes per slot.** The starter catalogue (`src/dishes.ts`) is
   filtered by the user's diet and allergies and their excluded dishes:
   - diet from IFCT food groups: meat (N, O) > fish (P–S) > egg (M) > dairy (L, ghee) > plant
   - a disallowed cooking fat is swapped (ghee → groundnut oil for vegans,
     groundnut oil → sunflower oil for a peanut allergy)
   - optional extras (minimum 0 g) are dropped; for Jain diets fixed onion,
     garlic and ginger are dropped and root vegetables rule a dish out
2. **Rotation.** Each day picks one dish per slot by rotation, never the same
   dish twice in a day. `variant` gives a different week.
3. **Quantities.** All ingredients of the day go to `solveDay()` in the calc
   engine. Each ingredient has a raw-weight range and step (rice 10 g, roti 30 g
   of atta, oil 5 g); a deterministic local search picks the quantities that
   best meet the targets.
4. **Check.** A day is on target when calories are within ±5%, protein at least
   95%, carbs and fat within ±10%, and fibre at least 90%. Up to 16 dish
   combinations are tried per day and the best kept. Misses are reported as
   warnings, never hidden.

Energy uses 4/4/9 kcal per g of protein, carbs and fat, the same as the targets.

## Known limits (starter catalogue)

- 40 dishes, raw weights only; cooked weights and katori/bowl sizes come with
  the cooking-yield table.
- Foods come from IFCT 2017 plus four USDA foods IFCT lacks: curd (whole and
  low fat), firm tofu and soya chunks.
- Case A (2,410 kcal, 160 g protein): non-veg, vegetarian and Jain plans with
  4–5 meals meet every target on 6–7 of 7 days. Three-meal and vegan plans
  often fall short on protein; the plan says so on the day and for the week.
- Dish recipes and ranges are drafts for dietitian review.
