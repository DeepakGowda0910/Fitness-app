# Food data notice

`src/data/ifct2017.json` is derived from the **Indian Food Composition Tables 2017**
(T. Longvah, R. Ananthan, K. Bhaskarachary, K. Venkaiah; ICMR-National
Institute of Nutrition, Hyderabad), via the MIT-licensed npm package
`@ifct2017/compositions` (© Subhajit Sahu).

Values are per 100 g edible portion. Regenerate with
`pnpm --filter @fitness/food-data import:ifct <path/to/index.csv>`.

**Licence status:** used for personal, non-commercial development. Commercial
use of the IFCT data must be confirmed with ICMR-NIN before launch (design doc,
open question 4).

## USDA supplement

`src/data/usda-sr-legacy.json` adds four foods that IFCT 2017 does not cover: curd
(whole milk and low fat), firm tofu and soya chunks (defatted soy flour, the
base of textured soy protein). Source: USDA FoodData Central, SR Legacy
(FDC IDs 171284, 170886, 172475, 174275), public domain. Carbohydrate is
stored as available carbohydrate (USDA carbohydrate by difference minus fibre)
to match IFCT.
