/**
 * Starter set of everyday Indian dishes, built only from IFCT 2017 foods.
 *
 * Quantities are raw / dry weights in grams. Each ingredient has a range and
 * a step; the solver picks the quantity. Vegetables and aromatics are usually
 * fixed; staples, proteins and oil flex. Nutrition is always computed from
 * these ingredients, never estimated per dish.
 *
 * Status: draft. To be reviewed by a dietitian before commercial use, and
 * expanded towards ~150 dishes (design doc, section 8).
 */

export type MealSlot = 'breakfast' | 'mid_morning' | 'lunch' | 'evening' | 'dinner';

export interface DishIngredient {
  /** IFCT 2017 food code. */
  code: string;
  minG: number;
  maxG: number;
  stepG: number;
  /** Household unit for display, e.g. "roti" with gramsPerUnit 30 (atta per roti). */
  unit?: { label: string; gramsPerUnit: number };
}

export interface Dish {
  id: string;
  name: string;
  slots: readonly MealSlot[];
  region?: string;
  ingredients: readonly DishIngredient[];
}

const flex = (code: string, minG: number, maxG: number, stepG: number, unit?: DishIngredient['unit']): DishIngredient =>
  unit ? { code, minG, maxG, stepG, unit } : { code, minG, maxG, stepG };
const fixed = (code: string, grams: number): DishIngredient => ({ code, minG: grams, maxG: grams, stepG: 1 });

const ROTI = { label: 'roti', gramsPerUnit: 30 };
const EGG = { label: 'egg', gramsPerUnit: 50 };

// IFCT codes used below, for readability.
const RICE = 'A015';
const RICE_FLAKES = 'A011';
const SEMOLINA = 'A022';
const ATTA = 'A019';
const RAGI = 'A010';
const JOWAR = 'A005';
const TOOR_DAL = 'B021';
const URAD_DAL = 'B003';
const MOONG_DAL = 'B010';
const MOONG_WHOLE = 'B011';
const CHANA_DAL = 'B001';
const CHANA_WHOLE = 'B002';
const RAJMA = 'B020';
const SOYA = 'B025';
const SPINACH = 'C033';
const CAULIFLOWER = 'D036';
const CUCUMBER = 'D043';
const OKRA = 'D056';
const PEAS = 'D061';
const PUMPKIN = 'D066';
const TOMATO = 'D075';
const CAPSICUM = 'D033';
const BANANA = 'E012';
const APPLE = 'E001';
const GUAVA = 'E028';
const CARROT = 'F002';
const ONION = 'G017';
const ALMOND = 'H001';
const COCONUT = 'H007';
const PEANUT = 'H012';
const MILK = 'L002';
const PANEER = 'L003';
const EGG_RAW = 'M001';
const EGG_BOILED = 'M004';
const EGG_WHITE = 'M002';
const MUSHROOM = 'J001';
const CHICKEN_BREAST = 'N003';
const CHICKEN_THIGH = 'N002';
const ROHU = 'S006';
const COCONUT_OIL = 'T001';
const GROUNDNUT_OIL = 'T005';
const MUSTARD_OIL = 'T006';
const GHEE = 'T013';

export const DISHES: readonly Dish[] = [
  // ---- Breakfast ----
  {
    id: 'idli_sambar',
    name: 'Idli with sambar',
    slots: ['breakfast'],
    region: 'South',
    ingredients: [
      flex(RICE, 40, 120, 10),
      flex(URAD_DAL, 15, 40, 5),
      flex(TOOR_DAL, 15, 40, 5),
      fixed(TOMATO, 40),
      fixed(ONION, 20),
      flex(GROUNDNUT_OIL, 3, 8, 5),
    ],
  },
  {
    id: 'poha',
    name: 'Poha with peanuts and peas',
    slots: ['breakfast'],
    region: 'West',
    ingredients: [flex(RICE_FLAKES, 40, 100, 10), flex(PEANUT, 10, 25, 5), fixed(ONION, 30), flex(PEAS, 20, 40, 10), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },
  {
    id: 'upma',
    name: 'Vegetable upma',
    slots: ['breakfast'],
    region: 'South',
    ingredients: [flex(SEMOLINA, 40, 90, 10), fixed(CARROT, 30), flex(PEAS, 20, 40, 10), fixed(ONION, 20), flex(GROUNDNUT_OIL, 5, 10, 5), flex(PEANUT, 0, 15, 5)],
  },
  {
    id: 'besan_chilla_paneer',
    name: 'Besan chilla with paneer filling',
    slots: ['breakfast', 'dinner'],
    region: 'North',
    ingredients: [flex(CHANA_DAL, 40, 90, 10), fixed(ONION, 30), fixed(TOMATO, 30), flex(PANEER, 0, 80, 10), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },
  {
    id: 'moong_chilla',
    name: 'Moong dal chilla',
    slots: ['breakfast', 'dinner'],
    region: 'North',
    ingredients: [flex(MOONG_DAL, 40, 100, 10), fixed(ONION, 30), fixed(TOMATO, 30), fixed(SPINACH, 30), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },
  {
    id: 'ragi_porridge',
    name: 'Ragi porridge with milk and banana',
    slots: ['breakfast'],
    region: 'South',
    ingredients: [flex(RAGI, 30, 70, 10), flex(MILK, 150, 300, 50), flex(BANANA, 0, 100, 50), flex(ALMOND, 0, 15, 5)],
  },
  {
    id: 'egg_bhurji_roti',
    name: 'Egg bhurji with roti',
    slots: ['breakfast', 'dinner'],
    region: 'North',
    ingredients: [flex(EGG_RAW, 100, 200, 50, EGG), flex(ATTA, 30, 90, 30, ROTI), fixed(ONION, 30), fixed(TOMATO, 30), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },
  {
    id: 'paneer_paratha',
    name: 'Paneer paratha',
    slots: ['breakfast'],
    region: 'North',
    ingredients: [flex(ATTA, 60, 120, 30, ROTI), flex(PANEER, 40, 100, 10), flex(GHEE, 5, 10, 5)],
  },

  {
    id: 'egg_white_omelette_toast',
    name: 'Egg and egg-white omelette with roti',
    slots: ['breakfast'],
    ingredients: [flex(EGG_RAW, 50, 100, 50, EGG), flex(EGG_WHITE, 60, 180, 30), fixed(ONION, 20), fixed(TOMATO, 30), fixed(MUSHROOM, 50), flex(ATTA, 30, 60, 30, ROTI), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },
  {
    id: 'paneer_bhurji_roti',
    name: 'Paneer bhurji with roti',
    slots: ['breakfast', 'dinner'],
    region: 'North',
    ingredients: [flex(PANEER, 80, 200, 10), flex(ATTA, 30, 90, 30, ROTI), fixed(ONION, 30), fixed(TOMATO, 40), fixed(CAPSICUM, 40), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },

  // ---- Lunch and dinner ----
  {
    id: 'dal_rice_sabzi',
    name: 'Toor dal, rice and cauliflower sabzi',
    slots: ['lunch', 'dinner'],
    ingredients: [flex(RICE, 50, 120, 10), flex(TOOR_DAL, 30, 90, 10), fixed(CAULIFLOWER, 100), fixed(TOMATO, 40), fixed(ONION, 30), flex(GROUNDNUT_OIL, 5, 15, 5)],
  },
  {
    id: 'rajma_chawal',
    name: 'Rajma chawal',
    slots: ['lunch', 'dinner'],
    region: 'North',
    ingredients: [flex(RAJMA, 40, 100, 10), flex(RICE, 50, 120, 10), fixed(ONION, 40), fixed(TOMATO, 50), flex(GROUNDNUT_OIL, 5, 15, 5)],
  },
  {
    id: 'chole_roti',
    name: 'Chole with roti',
    slots: ['lunch', 'dinner'],
    region: 'North',
    ingredients: [flex(CHANA_WHOLE, 40, 100, 10), flex(ATTA, 60, 120, 30, ROTI), fixed(ONION, 40), fixed(TOMATO, 50), flex(GROUNDNUT_OIL, 5, 15, 5)],
  },
  {
    id: 'palak_paneer_roti',
    name: 'Palak paneer with roti',
    slots: ['lunch', 'dinner'],
    region: 'North',
    ingredients: [fixed(SPINACH, 150), flex(PANEER, 60, 200, 10), flex(ATTA, 60, 120, 30, ROTI), fixed(ONION, 30), fixed(TOMATO, 30), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },
  {
    id: 'sambar_rice',
    name: 'Sambar rice with okra poriyal',
    slots: ['lunch', 'dinner'],
    region: 'South',
    ingredients: [flex(TOOR_DAL, 30, 60, 10), flex(RICE, 50, 120, 10), fixed(OKRA, 80), fixed(PUMPKIN, 50), fixed(TOMATO, 40), fixed(ONION, 30), flex(COCONUT_OIL, 5, 10, 5)],
  },
  {
    id: 'moong_khichdi',
    name: 'Moong dal khichdi',
    slots: ['lunch', 'dinner'],
    ingredients: [flex(RICE, 40, 90, 10), flex(MOONG_DAL, 30, 70, 10), fixed(PEAS, 30), fixed(CARROT, 40), flex(GHEE, 5, 10, 5)],
  },
  {
    id: 'ragi_mudde_saaru',
    name: 'Ragi mudde with bassaru',
    slots: ['lunch', 'dinner'],
    region: 'South',
    ingredients: [flex(RAGI, 60, 120, 20), flex(TOOR_DAL, 30, 60, 10), fixed(SPINACH, 80), fixed(TOMATO, 40), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },
  {
    id: 'jowar_roti_dal_palak',
    name: 'Jowar roti with dal palak',
    slots: ['lunch', 'dinner'],
    region: 'West',
    ingredients: [flex(JOWAR, 60, 120, 30, ROTI), flex(MOONG_DAL, 30, 90, 10), fixed(SPINACH, 100), fixed(TOMATO, 30), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },
  {
    id: 'soya_pulao',
    name: 'Soya and vegetable pulao',
    slots: ['lunch', 'dinner'],
    ingredients: [flex(SOYA, 30, 80, 10), flex(RICE, 50, 100, 10), fixed(PEAS, 30), fixed(CARROT, 30), fixed(ONION, 30), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },
  {
    id: 'chicken_curry_rice',
    name: 'Chicken curry with rice',
    slots: ['lunch', 'dinner'],
    ingredients: [flex(CHICKEN_BREAST, 100, 300, 25), flex(RICE, 50, 120, 10), fixed(ONION, 50), fixed(TOMATO, 50), flex(GROUNDNUT_OIL, 5, 15, 5)],
  },
  {
    id: 'chicken_roti',
    name: 'Chicken masala with roti and salad',
    slots: ['lunch', 'dinner'],
    region: 'North',
    ingredients: [flex(CHICKEN_THIGH, 100, 250, 25), flex(ATTA, 60, 120, 30, ROTI), fixed(ONION, 40), fixed(TOMATO, 40), fixed(CUCUMBER, 80), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },
  {
    id: 'fish_curry_rice',
    name: 'Rohu fish curry with rice',
    slots: ['lunch', 'dinner'],
    region: 'East',
    ingredients: [flex(ROHU, 100, 300, 25), flex(RICE, 50, 120, 10), flex(COCONUT, 10, 20, 5), fixed(ONION, 30), fixed(TOMATO, 40), flex(COCONUT_OIL, 5, 10, 5)],
  },
  {
    id: 'egg_curry_roti',
    name: 'Egg curry with roti',
    slots: ['lunch', 'dinner'],
    ingredients: [flex(EGG_BOILED, 100, 250, 50, EGG), flex(ATTA, 60, 120, 30, ROTI), fixed(ONION, 40), fixed(TOMATO, 50), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },

  {
    id: 'grilled_fish_salad',
    name: 'Grilled rohu with moong salad',
    slots: ['dinner'],
    ingredients: [flex(ROHU, 150, 300, 25), flex(MOONG_WHOLE, 30, 60, 10), fixed(CUCUMBER, 100), fixed(TOMATO, 50), flex(MUSTARD_OIL, 5, 10, 5)],
  },
  {
    id: 'tandoori_chicken_salad',
    name: 'Tandoori chicken with salad and roti',
    slots: ['dinner'],
    region: 'North',
    ingredients: [flex(CHICKEN_BREAST, 150, 300, 25), fixed(CUCUMBER, 100), fixed(ONION, 30), fixed(TOMATO, 50), flex(ATTA, 30, 90, 30, ROTI), flex(GROUNDNUT_OIL, 5, 10, 5)],
  },

  // ---- Snacks ----
  {
    id: 'fruit_almonds',
    name: 'Apple with almonds',
    slots: ['mid_morning', 'evening'],
    ingredients: [flex(APPLE, 100, 200, 50), flex(ALMOND, 10, 30, 5)],
  },
  {
    id: 'guava_peanuts',
    name: 'Guava with roasted peanuts',
    slots: ['mid_morning', 'evening'],
    ingredients: [flex(GUAVA, 100, 200, 50), flex(PEANUT, 10, 30, 5)],
  },
  {
    id: 'milk_banana',
    name: 'Milk and banana',
    slots: ['mid_morning', 'evening'],
    ingredients: [flex(MILK, 150, 300, 50), flex(BANANA, 50, 150, 50)],
  },
  {
    id: 'sprouts_chaat',
    name: 'Moong sprouts chaat',
    slots: ['mid_morning', 'evening'],
    ingredients: [flex(MOONG_WHOLE, 30, 70, 10), fixed(ONION, 20), fixed(TOMATO, 30), fixed(CUCUMBER, 50)],
  },
  {
    id: 'chana_peanut_mix',
    name: 'Boiled chana and peanut mix',
    slots: ['evening'],
    ingredients: [flex(CHANA_WHOLE, 30, 60, 10), flex(PEANUT, 10, 25, 5), fixed(ONION, 20)],
  },
  {
    id: 'paneer_tikka_snack',
    name: 'Paneer tikka',
    slots: ['evening'],
    ingredients: [flex(PANEER, 50, 150, 10), fixed(ONION, 30), flex(GROUNDNUT_OIL, 0, 5, 5)],
  },
  {
    id: 'sprouts_paneer_salad',
    name: 'Sprouts and paneer salad',
    slots: ['mid_morning', 'evening'],
    ingredients: [flex(MOONG_WHOLE, 30, 60, 10), flex(PANEER, 50, 120, 10), fixed(CUCUMBER, 50), fixed(TOMATO, 30)],
  },
  {
    id: 'roasted_chana_soya',
    name: 'Roasted chana and soya nuts',
    slots: ['evening'],
    ingredients: [flex(CHANA_WHOLE, 20, 50, 10), flex(SOYA, 20, 50, 10)],
  },
  {
    id: 'chicken_tikka_snack',
    name: 'Chicken tikka',
    slots: ['evening'],
    ingredients: [flex(CHICKEN_BREAST, 100, 200, 25), fixed(ONION, 30), flex(GROUNDNUT_OIL, 0, 5, 5)],
  },
  {
    id: 'boiled_eggs',
    name: 'Boiled eggs',
    slots: ['mid_morning', 'evening'],
    ingredients: [flex(EGG_BOILED, 50, 100, 50, EGG), flex(EGG_WHITE, 0, 90, 30)],
  },
];
