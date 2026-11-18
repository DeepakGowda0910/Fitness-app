# Calculation engine

`packages/calc-engine` owns every number the app shows: BMR, TDEE, calories,
macros, fibre, water, safety screening and goal feasibility. It is a pure
TypeScript library with no network, database or AI access. Same input, same
output. Every result records `engineVersion` and `policyVersion` plus the
validated inputs, so any stored target can be reproduced.

AI features may explain these numbers but never produce them.

## Where the numbers come from

All tunable values live in `packages/calc-engine/src/policy.ts`. They are
proposed defaults from widely used sports-nutrition guidance and **should be
reviewed by a registered dietitian before commercial launch**. Changing any
value means bumping `POLICY_VERSION`.

| Step | Rule |
| --- | --- |
| BMR | Mifflin-St Jeor: 10·W + 6.25·H − 5·A + (5 male / −161 female). Katch-McArdle (370 + 21.6·LBM) shown alongside only when body fat was *measured*. |
| Activity factor | Base from average daily steps (<5k 1.2, <7.5k 1.3, <10k 1.4, <12.5k 1.5, else 1.6) or, if unknown, occupation (1.2 / 1.3 / 1.4 / 1.55). Plus 0.05 per training day per hour of training. Clamped to 1.2–1.9. |
| TDEE | BMR × activity factor, with a ±10% uncertainty band. |
| Fat loss | Deficit for 0.5%/week by default (user may pick 0.1–1.0%; above 0.75% is flagged aggressive), using 7,700 kcal/kg. Capped at 25% of TDEE. |
| Recomposition | TDEE × 0.95 (warns if no resistance training). |
| Lean gain | Surplus 10% / 7.5% / 5% for beginner / intermediate / advanced. |
| Healthy weight gain | TDEE + 400 kcal. |
| Strength | TDEE × 1.025. Maintenance and endurance: TDEE. |
| Protein | g/kg of reference weight per goal (fat loss 2.0, recomp 2.1, lean gain 1.8, weight gain 1.6, maintenance 1.6, strength 1.8, endurance 1.6). Reference weight = actual weight, or the weight at BMI 25 when BMI ≥ 30. |
| Fat | Default 25–30% of calories by goal; never below 20% of calories or 0.6 g/kg. |
| Carbs | The remainder. Under 130 g/day raises a warning, not a block. |
| Fibre | 14 g per 1,000 kcal. |
| Water | 35 ml/kg, plus 500–750 ml per hour of training (guidance). |
| Rounding | Calories to 10 kcal (rounded *up* for deficits, so rounding never crosses a floor); grams to whole numbers. 4P + 4C + 9F is always within 1% of calories. |

### Safety

- **refer** (no deficit; maintenance guidance and a referral message): under 18,
  pregnant, breastfeeding, eating-disorder history, BMI under 18.5. An
  underweight adult may still pick a weight-gain goal.
- **caution**: insulin or sulfonylurea-treated diabetes, kidney or heart disease,
  or weight-affecting medication add a "review with your doctor" gate
  (`requiresDoctorReview`). Other conditions are recorded as flags.
- Calorie floors for any deficit: never below BMR, and never below 1,200 kcal
  (female) / 1,500 kcal (male). If the floor is at or above TDEE, the target
  falls back to maintenance.

### Goal feasibility

Required weekly change as % of body weight. Loss: ≤0.75% realistic, ≤1.0%
ambitious, above that unsafe. Gain: ≤0.35% realistic, ≤0.5% ambitious. Targets
below BMI 18.5 are always unsafe. A realistic date is suggested at 0.5%/week
(loss) or 0.25%/week (gain).

## Hand-checked reference cases

These match `test/reference-cases.test.ts`.

**Case A.** Male, 30 y, 180 cm, 80 kg, 8,000 steps/day, 4 × 60 min training, fat loss at the default 0.5%/week.

- BMR = 800 + 1125 − 150 + 5 = **1780**
- Activity = 1.4 (steps) + 4 × 0.05 = **1.6**; TDEE = 1780 × 1.6 = **2848** (range 2563–3133)
- Deficit = 80 × 0.005 × 7700 / 7 = 440 (cap 712) → 2408 → rounded up **2410 kcal**
- Protein 2.0 × 80 = **160 g**; fat 25% × 2410 / 9 = **67 g**; carbs (2410 − 640 − 603) / 4 = **292 g**
- Fibre 14 × 2.41 = **34 g**; water 35 × 80 = **2800 ml**

**Case B.** Female, 45 y, 160 cm, 95 kg (BMI 37.1), light job, no steps given, no training, fat loss at 0.75%/week.

- BMR = 950 + 1000 − 225 − 161 = **1564**; TDEE = 1564 × 1.3 = **2033**
- Wanted deficit 784 kcal, capped at 25% = 508 → 1525, below BMR → floor **1564** → **1570 kcal**
- Reference weight = 25 × 1.6² = **64 kg**; protein 2.0 × 64 = **128 g**
- Fat 25% × 1570 / 9 = **44 g**; carbs (1570 − 512 − 396) / 4 = **166 g**; fibre **22 g**; water **3350 ml**

**Case C.** Female, 70 y, 150 cm, 50 kg, 2,000 steps, fat loss.

- BMR = 500 + 937.5 − 350 − 161 = **927**; TDEE = 927 × 1.2 = **1112**
- The 1,200 kcal floor is above TDEE, so no deficit: target **1112 kcal** (maintenance) with a warning.

## Property tests

`test/properties.test.ts` checks thousands of random profiles each run:
macros match calories within 1%, no negative macros, fat ≥ 20% of calories,
deficits never cross a floor or exceed 25% of TDEE, a "refer" outcome never
gets a deficit, the activity factor stays within 1.2–1.9, and results are
deterministic.
