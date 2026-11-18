# Food data notice

`ifct2017.json` is derived from the **Indian Food Composition Tables 2017**
(T. Longvah, R. Ananthan, K. Bhaskarachary, K. Venkaiah; ICMR-National
Institute of Nutrition, Hyderabad), via the MIT-licensed npm package
`@ifct2017/compositions` (© Subhajit Sahu).

Values are per 100 g edible portion. Regenerate with
`pnpm --filter @fitness/food-data import:ifct <path/to/index.csv>`.

**Licence status:** used for personal, non-commercial development. Commercial
use of the IFCT data must be confirmed with ICMR-NIN before launch (design doc,
open question 4).
