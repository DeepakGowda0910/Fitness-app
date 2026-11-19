/**
 * Step-by-step cooking instructions for every dish in the catalogue.
 *
 * Recipes never set or change quantities. Each step names ingredients by a
 * short key such as {rice} or {oil}; `recipeFor` fills those in with the exact
 * grams the planner already chose for that meal. So the recipe always matches
 * the plan's numbers, and nothing here feeds back into the calculation.
 *
 * Pantry items (salt, spices, water, lemon, herbs) are listed separately. They
 * add very few calories and are not counted in the plan's totals.
 *
 * Status: draft, written for home cooks. To be reviewed by a dietitian
 * alongside the dish catalogue before commercial use.
 */
import type { DietType } from './classify.js';
import type { PlannedMeal } from './planner.js';

/** Ingredient keys used in recipe text, each matching one or more food codes. */
const KEYS: Record<string, readonly string[]> = {
  rice: ['A015'],
  poha: ['A011'],
  rava: ['A022'],
  atta: ['A019'],
  ragi: ['A010'],
  jowar: ['A005'],
  toor: ['B021'],
  urad: ['B003'],
  moongdal: ['B010'],
  moong: ['B011'],
  besan: ['B001'],
  chana: ['B002'],
  rajma: ['B020'],
  soyabean: ['B025'],
  spinach: ['C033'],
  cauliflower: ['D036'],
  cucumber: ['D043'],
  okra: ['D056'],
  peas: ['D061'],
  pumpkin: ['D066'],
  tomato: ['D075'],
  capsicum: ['D033'],
  banana: ['E012'],
  apple: ['E001'],
  guava: ['E028'],
  carrot: ['F002'],
  onion: ['G017'],
  almond: ['H001'],
  coconut: ['H007'],
  peanut: ['H012'],
  milk: ['L002'],
  paneer: ['L003'],
  egg: ['M001', 'M004'],
  eggwhite: ['M002'],
  mushroom: ['J001'],
  chicken: ['N003', 'N002'],
  fish: ['S006'],
  curd: ['USDA:171284', 'USDA:170886'],
  tofu: ['USDA:172475'],
  soya: ['USDA:174275'],
  // Any cooking fat: the planner may swap one for another (diet or allergy).
  oil: ['T005', 'T012', 'T001', 'T006', 'T008', 'T013'],
};

/** Short, kitchen-friendly names for display in recipe steps. */
const LABELS: Record<string, string> = {
  A015: 'rice (uncooked)',
  A011: 'poha (thick rice flakes)',
  A022: 'rava (semolina)',
  A019: 'whole-wheat atta',
  A010: 'ragi flour',
  A005: 'jowar flour',
  B021: 'toor dal (dry)',
  B003: 'urad dal (dry)',
  B010: 'moong dal (dry)',
  B011: 'whole moong (dry)',
  B001: 'besan or chana dal (dry)',
  B002: 'kabuli chana (dry)',
  B020: 'rajma (dry)',
  B025: 'soya beans (dry)',
  C033: 'spinach (palak)',
  D036: 'cauliflower',
  D043: 'cucumber',
  D056: 'okra (bhindi)',
  D061: 'green peas',
  D066: 'pumpkin',
  D075: 'tomato',
  D033: 'capsicum',
  E012: 'banana',
  E001: 'apple',
  E028: 'guava',
  F002: 'carrot',
  G017: 'onion',
  H001: 'almonds',
  H007: 'fresh grated coconut',
  H012: 'peanuts',
  L002: 'whole milk',
  L003: 'paneer',
  M001: 'eggs',
  M004: 'eggs',
  M002: 'egg whites',
  J001: 'button mushrooms',
  N003: 'skinless chicken breast',
  N002: 'skinless chicken thigh',
  S006: 'rohu fish',
  'USDA:171284': 'curd (dahi)',
  'USDA:170886': 'low-fat curd',
  'USDA:172475': 'firm tofu',
  'USDA:174275': 'soya chunks (dry)',
  T005: 'groundnut oil',
  T012: 'sunflower oil',
  T001: 'coconut oil',
  T006: 'mustard oil',
  T008: 'rice bran oil',
  T013: 'ghee',
};

const FATS = new Set(KEYS.oil);
const MILKS = new Set(['L002']);

/** Pantry items a Jain diet leaves out. */
const NOT_JAIN = new Set(['ginger', 'garlic', 'ginger-garlic paste', 'green chilli and garlic']);

interface StepTemplate {
  text: string;
  /** Show this step only when every listed key is in the meal. */
  if?: readonly string[];
  /** Show this step only when none of the listed keys is in the meal. */
  unless?: readonly string[];
  /** Leave this step out for a Jain diet (it uses ginger or garlic). */
  notJain?: true;
  /** Show this step only for a Jain diet (the version without ginger or garlic). */
  jainOnly?: true;
}

interface RecipeTemplate {
  prepMin: number;
  cookMin: number;
  /** Extra time that is mostly waiting, e.g. "Soak overnight". */
  ahead?: string;
  method: string;
  pantry: readonly string[];
  steps: readonly (string | StepTemplate)[];
  tip: string;
}

const SALT_SPICE = ['salt', 'turmeric', 'red chilli powder'];

export const RECIPES: Readonly<Record<string, RecipeTemplate>> = {
  // ---- Breakfast ----
  idli_sambar: {
    prepMin: 20,
    cookMin: 30,
    ahead: 'Soak 4 to 6 hours, then ferment the batter overnight',
    method: 'Steamed',
    pantry: ['salt', 'turmeric', 'sambar powder', 'tamarind (a small piece)', 'mustard seeds', 'curry leaves', 'hing'],
    steps: [
      'Rinse {rice} and {urad} separately and soak each in water for 4 to 6 hours.',
      'Grind the urad dal to a fluffy batter, then grind the rice slightly coarse. Mix both with salt and leave covered overnight to ferment.',
      'Pour the batter into greased idli moulds and steam for 10 to 12 minutes, until a knife comes out clean.',
      'For the sambar, pressure-cook {toor} with 1 cup water and a pinch of turmeric for 3 to 4 whistles, then mash.',
      'Heat {oil} in a pan, add mustard seeds, curry leaves and hing.',
      { text: 'Add {onion} (sliced) and cook for 2 minutes.', if: ['onion'] },
      'Add {tomato} (chopped), tamarind water, sambar powder and the mashed dal with 1 cup water. Simmer for 8 to 10 minutes and serve with the idlis.',
    ],
    tip: 'Fermented batter is easier to digest. Make a bigger batch and keep it in the fridge for 3 days, then weigh out today’s share.',
  },
  poha: {
    prepMin: 10,
    cookMin: 10,
    method: 'Pan-cooked',
    pantry: ['salt', 'turmeric', 'mustard seeds', 'curry leaves', 'green chilli', 'lemon juice', 'coriander leaves'],
    steps: [
      'Rinse {poha} in a strainer under running water for a few seconds, then leave it to soften for 5 minutes.',
      'Dry-roast {peanut} in a pan until crunchy, then set them aside.',
      'Heat {oil} in the same pan. Add mustard seeds, curry leaves and green chilli.',
      { text: 'Add {onion} (chopped) and cook until soft.', if: ['onion'] },
      'Add {peas} and a pinch of turmeric, cover and cook for 3 minutes.',
      'Add the poha and salt, mix gently and cook for 2 minutes. Top with the peanuts, lemon juice and coriander.',
    ],
    tip: 'Dry-roasting the peanuts instead of frying them keeps the oil to the measured amount.',
  },
  upma: {
    prepMin: 10,
    cookMin: 15,
    method: 'Pan-cooked',
    pantry: ['salt', 'mustard seeds', 'urad dal (a pinch, for tempering)', 'curry leaves', 'green chilli', 'ginger'],
    steps: [
      'Dry-roast {rava} in a pan on low heat until it smells nutty, about 4 minutes. Set it aside.',
      { text: 'Dry-roast {peanut} until crunchy and set aside.', if: ['peanut'] },
      'Heat {oil}. Add mustard seeds, curry leaves and green chilli.',
      { text: 'Add a little grated ginger.', notJain: true },
      { text: 'Add {onion} (chopped) and cook until soft.', if: ['onion'] },
      { text: 'Add {carrot} (diced) and {peas}. Cook for 3 minutes.', if: ['carrot'] },
      { text: 'Add {peas} and cook for 2 minutes.', unless: ['carrot'] },
      'Pour in about 2.5 times the rava’s volume of water with salt and bring to a boil.',
      'Lower the heat, add the rava slowly while stirring so no lumps form. Cover and cook for 2 to 3 minutes until fluffy.',
      { text: 'Top with the roasted peanuts.', if: ['peanut'] },
    ],
    tip: 'Adding extra vegetables such as beans or capsicum adds fibre and volume for very few calories.',
  },
  besan_chilla_paneer: {
    prepMin: 10,
    cookMin: 15,
    method: 'Pan-cooked on a non-stick tawa',
    pantry: ['salt', 'turmeric', 'ajwain', 'green chilli', 'coriander leaves', 'water'],
    steps: [
      'Use {besan} (if you have chana dal, soak it for 2 hours and grind it smooth).',
      'Whisk the besan with salt, turmeric, ajwain and enough water to make a smooth, pourable batter.',
      { text: 'Stir in {onion} (finely chopped), {tomato} (finely chopped), green chilli and coriander.', if: ['onion'] },
      { text: 'Stir in {tomato} (finely chopped), green chilli and coriander.', unless: ['onion'] },
      { text: 'Crumble {paneer} with a pinch of salt for the filling.', if: ['paneer'] },
      'Heat a non-stick tawa and brush it with a little of {oil}. Pour a ladle of batter and spread it thin.',
      'Drizzle a few drops of the oil around the edges and cook until golden, then flip and cook the other side.',
      { text: 'Spread some paneer on one half, fold and serve. Repeat with the rest of the batter.', if: ['paneer'] },
      { text: 'Repeat with the rest of the batter.', unless: ['paneer'] },
    ],
    tip: 'A non-stick tawa lets the measured oil cover all the chillas. Use a brush or spoon, not a pour.',
  },
  moong_chilla: {
    prepMin: 10,
    cookMin: 15,
    ahead: 'Soak the dal for 2 to 3 hours',
    method: 'Pan-cooked on a non-stick tawa',
    pantry: ['salt', 'cumin seeds', 'green chilli', 'ginger', 'coriander leaves'],
    steps: [
      'Rinse {moongdal} and soak it in water for 2 to 3 hours.',
      { text: 'Drain and grind it with a little water, green chilli and ginger into a smooth batter. Add salt and cumin.', notJain: true },
      { text: 'Drain and grind it with a little water and green chilli into a smooth batter. Add salt and cumin.', jainOnly: true },
      { text: 'Stir in {onion}, {tomato} and {spinach}, all finely chopped.', if: ['onion'] },
      { text: 'Stir in {tomato} and {spinach}, both finely chopped.', unless: ['onion'] },
      'Heat a non-stick tawa and brush it with a little of {oil}. Pour a ladle of batter and spread it thin.',
      'Cook until the edges lift, then flip and cook for another minute. Repeat with the rest of the batter.',
    ],
    tip: 'Serve with mint chutney instead of ketchup to keep sugar low.',
  },
  ragi_porridge: {
    prepMin: 5,
    cookMin: 10,
    method: 'Simmered',
    pantry: ['a pinch of cardamom powder', 'water'],
    steps: [
      'Whisk {ragi} into 1 cup of cold water until there are no lumps.',
      'Cook on low heat, stirring all the time, for 5 to 6 minutes until it thickens and turns glossy.',
      'Add {milk} and cardamom, and simmer for 2 more minutes.',
      { text: 'Slice {banana} on top.', if: ['banana'] },
      { text: 'Chop {almond} and sprinkle over.', if: ['almond'] },
    ],
    tip: 'The banana adds natural sweetness, so you do not need sugar or jaggery.',
  },
  egg_bhurji_roti: {
    prepMin: 10,
    cookMin: 15,
    method: 'Pan-cooked',
    pantry: ['salt', 'turmeric', 'red chilli powder', 'green chilli', 'coriander leaves', 'water'],
    steps: [
      'Knead {atta} with water and a pinch of salt into a soft dough. Rest it for 10 minutes.',
      'Heat {oil} in a pan.',
      { text: 'Add {onion} (chopped) and green chilli and cook until soft.', if: ['onion'] },
      'Add {tomato} (chopped), turmeric, chilli powder and salt. Cook for 2 minutes.',
      'Beat {egg}, pour into the pan and keep stirring on medium heat until just set. Top with coriander.',
      'Roll out the rotis and cook them on a hot dry tawa, about 1 minute each side.',
    ],
    tip: 'Cook the rotis on a dry tawa without ghee. The oil in the bhurji is already counted.',
  },
  paneer_paratha: {
    prepMin: 15,
    cookMin: 15,
    method: 'Pan-cooked on a tawa',
    pantry: ['salt', 'ajwain', 'green chilli', 'coriander leaves', 'water'],
    steps: [
      'Knead {atta} with water and a pinch of salt into a soft dough. Rest it for 10 minutes.',
      'Grate {paneer} and mix with salt, ajwain, chopped green chilli and coriander.',
      'Divide the dough into balls, flatten each one, put some filling in the middle, seal and roll out gently.',
      'Cook on a hot tawa until brown spots appear on both sides, brushing with {oil} in total.',
      { text: 'Serve with {curd}.', if: ['curd'] },
    ],
    tip: 'Brush the ghee on with a spoon instead of pouring it, so the measured amount covers every paratha.',
  },
  egg_white_omelette_toast: {
    prepMin: 10,
    cookMin: 10,
    method: 'Pan-cooked',
    pantry: ['salt', 'black pepper', 'green chilli', 'coriander leaves', 'water'],
    steps: [
      'Knead {atta} with water into a soft dough and rest it while you prepare the omelette.',
      'Whisk {egg} with {eggwhite}, salt and pepper.',
      { text: 'Chop {onion}, {tomato} and slice {mushroom}.', if: ['onion'] },
      { text: 'Chop {tomato} and slice {mushroom}.', unless: ['onion'] },
      'Heat {oil} in a non-stick pan and sauté the vegetables for 2 to 3 minutes.',
      'Pour in the eggs, tilt the pan to spread them, cover and cook on low heat until set. Fold and serve.',
      'Roll out the rotis and cook them on a hot dry tawa.',
    ],
    tip: 'Egg whites add protein with almost no fat, which is why this omelette is so filling for its calories.',
  },
  paneer_bhurji_roti: {
    prepMin: 10,
    cookMin: 15,
    method: 'Pan-cooked',
    pantry: [...SALT_SPICE, 'garam masala', 'cumin seeds', 'coriander leaves', 'water'],
    steps: [
      'Knead {atta} with water into a soft dough and rest it for 10 minutes.',
      'Crumble {paneer} with your hands.',
      'Heat {oil} in a pan and add cumin seeds.',
      { text: 'Add {onion} (chopped) and cook until soft.', if: ['onion'] },
      'Add {tomato} and {capsicum}, both chopped, with the spices and salt. Cook for 3 minutes.',
      'Add the paneer and stir for 2 minutes. Do not overcook or it turns rubbery. Top with coriander.',
      'Roll out the rotis and cook them on a hot dry tawa.',
    ],
    tip: 'Low-fat paneer would cut calories, but the plan is calculated for regular paneer, so use that to keep the numbers right.',
  },
  tofu_bhurji_roti: {
    prepMin: 10,
    cookMin: 15,
    method: 'Pan-cooked',
    pantry: [...SALT_SPICE, 'garam masala', 'cumin seeds', 'black salt (kala namak)', 'coriander leaves', 'water'],
    steps: [
      'Knead {atta} with water into a soft dough and rest it for 10 minutes.',
      'Press {tofu} between paper towels to remove water, then crumble it.',
      'Heat {oil} in a pan and add cumin seeds.',
      { text: 'Add {onion} (chopped) and cook until soft.', if: ['onion'] },
      'Add {tomato} and {capsicum}, both chopped, with turmeric, chilli and salt. Cook for 3 minutes.',
      'Add the tofu and a pinch of kala namak (it gives an eggy taste). Cook for 3 to 4 minutes. Top with coriander.',
      'Roll out the rotis and cook them on a hot dry tawa.',
    ],
    tip: 'Pressing the tofu well helps it soak up the spices, so it needs no extra oil.',
  },

  // ---- Lunch and dinner ----
  dal_rice_sabzi: {
    prepMin: 15,
    cookMin: 30,
    method: 'Pressure-cooked and stir-fried',
    pantry: [...SALT_SPICE, 'mustard or cumin seeds', 'hing', 'curry leaves', 'water'],
    steps: [
      'Rinse {rice} and cook it with twice its volume of water until soft.',
      'Rinse {toor} and pressure-cook it with 1.5 cups water and a pinch of turmeric for 3 to 4 whistles. Mash it.',
      'Heat half of {oil} in a pan, add mustard or cumin seeds, hing and curry leaves.',
      { text: 'Add {onion} (chopped) and cook until soft.', if: ['onion'] },
      'Add {tomato} (chopped) and the spices, cook for 2 minutes, then pour in the dal. Simmer for 5 minutes.',
      'In another pan, heat the rest of the oil and add {cauliflower} (in small florets) with turmeric and salt. Cover and cook for 8 to 10 minutes until tender.',
      { text: 'Serve with {curd}.', if: ['curd'] },
    ],
    tip: 'Cooking the cauliflower covered lets it steam in its own moisture, so it needs very little oil.',
  },
  rajma_chawal: {
    prepMin: 10,
    cookMin: 40,
    ahead: 'Soak the rajma overnight',
    method: 'Pressure-cooked',
    pantry: [...SALT_SPICE, 'garam masala', 'cumin seeds', 'ginger-garlic paste', 'water'],
    steps: [
      'Soak {rajma} overnight in plenty of water.',
      'Drain and pressure-cook the rajma with fresh water and salt for 6 to 8 whistles, until very soft.',
      'Rinse {rice} and cook it with twice its volume of water.',
      'Heat {oil} in a pan and add cumin seeds.',
      { text: 'Add {onion} (finely chopped) and cook until golden.', if: ['onion'] },
      { text: 'Add the ginger-garlic paste and cook for a minute.', notJain: true },
      'Add {tomato} (puréed) and the spices. Cook until the oil separates.',
      'Add the rajma with its cooking water and simmer for 10 minutes, mashing a few beans to thicken it. Serve with the rice.',
    ],
    tip: 'Mashing some beans gives a creamy gravy without adding butter or cream.',
  },
  chole_roti: {
    prepMin: 15,
    cookMin: 40,
    ahead: 'Soak the chana overnight',
    method: 'Pressure-cooked',
    pantry: [...SALT_SPICE, 'chole masala', 'cumin seeds', 'ginger-garlic paste', 'a tea bag or dried amla (for colour)', 'water'],
    steps: [
      'Soak {chana} overnight in plenty of water.',
      'Drain and pressure-cook the chana with fresh water, salt and a tea bag for 5 to 6 whistles.',
      'Knead {atta} with water into a soft dough and rest it for 10 minutes.',
      'Heat {oil} and add cumin seeds.',
      { text: 'Add {onion} (finely chopped) and cook until golden.', if: ['onion'] },
      { text: 'Add the ginger-garlic paste and cook for a minute.', notJain: true },
      'Add {tomato} (puréed) and chole masala. Cook until thick.',
      'Add the chana (remove the tea bag) and simmer for 10 minutes.',
      'Roll out the rotis and cook them on a hot dry tawa.',
    ],
    tip: 'Rotis cooked on a dry tawa instead of bhaturas save a lot of oil.',
  },
  palak_paneer_roti: {
    prepMin: 15,
    cookMin: 20,
    method: 'Blanched and simmered',
    pantry: ['salt', 'cumin seeds', 'garam masala', 'green chilli', 'ginger', 'garlic', 'water'],
    steps: [
      'Blanch {spinach} in boiling water for 2 minutes, then cool it in cold water. Blend it with green chilli to a smooth purée.',
      'Cut {paneer} into cubes.',
      'Knead {atta} with water into a soft dough and rest it for 10 minutes.',
      'Heat {oil} and add cumin seeds.',
      { text: 'Add chopped ginger and garlic.', notJain: true },
      { text: 'Add {onion} (finely chopped) and cook until soft.', if: ['onion'] },
      'Add {tomato} (chopped) and cook for 2 minutes.',
      'Add the spinach purée, salt and garam masala. Simmer for 3 minutes, then add the paneer and heat through for 2 minutes.',
      'Roll out the rotis and cook them on a hot dry tawa.',
    ],
    tip: 'Skip the cream that restaurant versions use. The spinach purée is creamy on its own.',
  },
  sambar_rice: {
    prepMin: 15,
    cookMin: 35,
    method: 'Pressure-cooked and stir-fried',
    pantry: ['salt', 'turmeric', 'sambar powder', 'tamarind (a small piece)', 'mustard seeds', 'curry leaves', 'hing', 'dried red chilli', 'water'],
    steps: [
      'Rinse {rice} and cook it with twice its volume of water.',
      'Pressure-cook {toor} with 1.5 cups water and turmeric for 3 to 4 whistles, then mash.',
      'Boil {pumpkin} (cubed) in tamarind water with salt and sambar powder for 5 minutes.',
      { text: 'Add {onion} (sliced) to the pot as well.', if: ['onion'] },
      'Add {tomato} (chopped) and the mashed dal. Simmer for 5 minutes.',
      'Heat half of {oil}, add mustard seeds, curry leaves, hing and red chilli, and pour this over the sambar.',
      'For the poriyal, heat the rest of the oil and add {okra} (sliced) with salt. Cook uncovered for 8 to 10 minutes until it is no longer sticky.',
      'Mix the rice with the sambar.',
      { text: 'Serve with {curd}.', if: ['curd'] },
    ],
    tip: 'Keep the okra pan uncovered and dry. It stops being slimy without extra oil.',
  },
  moong_khichdi: {
    prepMin: 10,
    cookMin: 25,
    method: 'Pressure-cooked',
    pantry: ['salt', 'turmeric', 'cumin seeds', 'hing', 'ginger', 'water'],
    steps: [
      'Rinse {rice} and {moongdal} together and soak for 15 minutes.',
      'Heat {oil} in a pressure cooker and add cumin seeds and hing.',
      { text: 'Add grated ginger.', notJain: true },
      { text: 'Add {carrot} (diced) and {peas} and stir for a minute.', if: ['carrot'] },
      { text: 'Add {peas} and stir for a minute.', unless: ['carrot'] },
      'Add the rice and dal, turmeric, salt and about 4 times their volume of water. Pressure-cook for 3 to 4 whistles.',
      { text: 'Serve with {curd}.', if: ['curd'] },
    ],
    tip: 'Ghee is used for the tempering only. Avoid adding more on top, it is already counted.',
  },
  ragi_mudde_saaru: {
    prepMin: 10,
    cookMin: 30,
    method: 'Boiled and simmered',
    pantry: ['salt', 'saaru or rasam powder', 'tamarind (a small piece)', 'mustard seeds', 'curry leaves', 'garlic', 'water'],
    steps: [
      'Pressure-cook {toor} and {spinach} with 2 cups water for 3 whistles.',
      'Strain the cooking water and keep it. This thin stock is the bassaru base. Mash the dal and spinach separately for palya if you like.',
      'Bring the stock to a boil with {tomato} (chopped), tamarind water, saaru powder and salt. Simmer for 8 minutes.',
      'Heat {oil}, add mustard seeds and curry leaves, and pour it over the saaru.',
      { text: 'Add crushed garlic to the tempering.', notJain: true },
      'For the mudde, boil water (about twice the volume of the flour) with a pinch of salt. Add {ragi} in one go, leave it for 1 minute, then stir hard with a wooden stick until smooth.',
      'Cook on low for 5 minutes, wet your hands and shape it into balls. Serve with the saaru and the dal mixture.',
    ],
    tip: 'Ragi is rich in calcium and fibre, and mudde keeps you full for a long time.',
  },
  jowar_roti_dal_palak: {
    prepMin: 15,
    cookMin: 25,
    method: 'Pressure-cooked and tawa-cooked',
    pantry: ['salt', 'turmeric', 'cumin seeds', 'hing', 'garlic', 'warm water'],
    steps: [
      'Pressure-cook {moongdal} with 1.5 cups water and turmeric for 2 to 3 whistles.',
      'Heat {oil}, add cumin seeds and hing.',
      { text: 'Add chopped garlic.', notJain: true },
      'Add {tomato} (chopped) and cook for 2 minutes. Add {spinach} (chopped) and cook until wilted.',
      'Add the dal and salt and simmer for 5 minutes.',
      'Knead {jowar} with warm water into a soft dough. Pat each ball out between your palms or on a floured sheet.',
      'Cook each roti on a hot dry tawa, sprinkling water on top, then flip and cook until puffed.',
    ],
    tip: 'Jowar is gluten-free and high in fibre. Make the dough fresh each time, it dries quickly.',
  },
  soya_pulao: {
    prepMin: 15,
    cookMin: 20,
    method: 'Pressure-cooked',
    pantry: ['salt', 'bay leaf', 'cloves', 'cinnamon', 'cumin seeds', 'garam masala', 'water'],
    steps: [
      'Soak {soya} in hot water for 10 minutes, squeeze out the water and cut big chunks in half.',
      'Rinse {rice} and soak for 15 minutes.',
      'Heat {oil} in a pressure cooker and add bay leaf, cloves, cinnamon and cumin.',
      { text: 'Add {onion} (sliced) and cook until light brown.', if: ['onion'] },
      { text: 'Add {peas}, {carrot} (diced) and the soya chunks. Stir for 2 minutes.', if: ['carrot'] },
      { text: 'Add {peas} and the soya chunks. Stir for 2 minutes.', unless: ['carrot'] },
      'Add the rice, garam masala, salt and twice the rice’s volume of water. Pressure-cook for 2 whistles.',
    ],
    tip: 'Squeezing the soaked soya chunks well removes the raw smell, so you need no extra masala or oil.',
  },
  soya_chunk_curry_rice: {
    prepMin: 15,
    cookMin: 25,
    method: 'Simmered',
    pantry: [...SALT_SPICE, 'garam masala', 'coriander powder', 'ginger-garlic paste', 'water'],
    steps: [
      'Soak {soya} in hot water for 10 minutes, then squeeze out the water.',
      'Rinse {rice} and cook it with twice its volume of water.',
      'Heat {oil} in a pan.',
      { text: 'Add {onion} (finely chopped) and cook until golden.', if: ['onion'] },
      { text: 'Add ginger-garlic paste and cook for a minute.', notJain: true },
      'Add {tomato} (puréed) and the spices. Cook until thick.',
      'Add the soya chunks and 1 cup water. Simmer for 10 minutes and serve with the rice.',
    ],
    tip: 'Soya chunks are one of the most protein-dense vegetarian foods, so this meal helps you reach your protein target.',
  },
  tofu_palak_roti: {
    prepMin: 15,
    cookMin: 20,
    method: 'Blanched and simmered',
    pantry: ['salt', 'cumin seeds', 'garam masala', 'green chilli', 'ginger', 'garlic', 'water'],
    steps: [
      'Blanch {spinach} in boiling water for 2 minutes, cool in cold water and blend with green chilli.',
      'Press {tofu} between paper towels and cut it into cubes.',
      'Knead {atta} with water into a soft dough and rest it for 10 minutes.',
      'Heat {oil} and add cumin seeds.',
      { text: 'Add chopped ginger and garlic.', notJain: true },
      { text: 'Add {onion} (finely chopped) and cook until soft.', if: ['onion'] },
      'Add {tomato} (chopped) and cook for 2 minutes.',
      'Add the spinach purée, salt and garam masala. Simmer for 3 minutes, then add the tofu and heat through.',
      'Roll out the rotis and cook them on a hot dry tawa.',
    ],
    tip: 'Tofu takes the place of paneer here with less fat, and it soaks up the spinach flavour.',
  },
  chicken_curry_rice: {
    prepMin: 15,
    cookMin: 30,
    method: 'Simmered',
    pantry: [...SALT_SPICE, 'coriander powder', 'garam masala', 'ginger-garlic paste', 'water'],
    steps: [
      'Cut {chicken} into pieces and rub with salt, turmeric and half the ginger-garlic paste. Rest for 15 minutes.',
      'Rinse {rice} and cook it with twice its volume of water.',
      'Heat {oil} in a pan.',
      { text: 'Add {onion} (finely chopped) and cook until golden.', if: ['onion'] },
      'Add the rest of the ginger-garlic paste, then {tomato} (puréed) and the spices. Cook until thick.',
      'Add the chicken, stir to coat, then add ½ cup water. Cover and simmer for 15 to 18 minutes until cooked through.',
    ],
    tip: 'Weigh the chicken raw and skinless. The plan’s protein counts the raw weight.',
  },
  chicken_roti: {
    prepMin: 15,
    cookMin: 30,
    method: 'Pan-cooked',
    pantry: [...SALT_SPICE, 'garam masala', 'ginger-garlic paste', 'lemon juice', 'water'],
    steps: [
      'Cut {chicken} into pieces and rub with salt, chilli powder and ginger-garlic paste.',
      'Knead {atta} with water into a soft dough and rest it for 10 minutes.',
      'Heat {oil} in a pan.',
      { text: 'Add {onion} (chopped) and cook until golden.', if: ['onion'] },
      'Add {tomato} (chopped) and the spices and cook until soft. Add the chicken and cook covered for 15 to 18 minutes, stirring now and then.',
      'Slice {cucumber} for the salad and squeeze lemon juice over it.',
      'Roll out the rotis and cook them on a hot dry tawa.',
    ],
    tip: 'Thigh meat stays juicy with very little oil. Covering the pan steams it in its own juices.',
  },
  fish_curry_rice: {
    prepMin: 15,
    cookMin: 25,
    method: 'Simmered',
    pantry: ['salt', 'turmeric', 'red chilli powder', 'tamarind (a small piece)', 'curry leaves', 'mustard seeds', 'water'],
    steps: [
      'Rub {fish} pieces with salt and turmeric and set aside.',
      'Rinse {rice} and cook it with twice its volume of water.',
      'Grind {coconut} with chilli powder and a little water to a smooth paste.',
      'Heat {oil}, add mustard seeds and curry leaves.',
      { text: 'Add {onion} (sliced) and cook until soft.', if: ['onion'] },
      'Add {tomato} (chopped), the coconut paste, tamarind water and 1 cup water. Bring to a simmer.',
      'Slide in the fish and simmer gently for 8 to 10 minutes. Do not stir too much or the fish will break.',
    ],
    tip: 'Poaching the fish in the curry, instead of frying it first, saves oil and keeps it tender.',
  },
  egg_curry_roti: {
    prepMin: 10,
    cookMin: 25,
    method: 'Boiled and simmered',
    pantry: [...SALT_SPICE, 'garam masala', 'ginger-garlic paste', 'water'],
    steps: [
      'Boil {egg} for 10 minutes, cool in cold water, peel and make small slits on each egg.',
      'Knead {atta} with water into a soft dough and rest it for 10 minutes.',
      'Heat {oil} in a pan.',
      { text: 'Add {onion} (finely chopped) and cook until golden.', if: ['onion'] },
      'Add ginger-garlic paste, then {tomato} (puréed) and the spices. Cook until thick.',
      'Add 1 cup water and the eggs and simmer for 5 minutes.',
      'Roll out the rotis and cook them on a hot dry tawa.',
    ],
    tip: 'Slitting the eggs lets the gravy soak in, so the curry tastes rich without extra oil.',
  },
  grilled_fish_salad: {
    prepMin: 15,
    cookMin: 15,
    ahead: 'Sprout the moong for 1 to 2 days, or buy sprouts',
    method: 'Grilled',
    pantry: ['salt', 'turmeric', 'red chilli powder', 'lemon juice', 'chaat masala', 'water'],
    steps: [
      'Soak {moong} overnight, drain and leave covered for a day to sprout. Steam the sprouts for 5 minutes.',
      'Rub {fish} with salt, turmeric, chilli powder, lemon juice and half of {oil}. Rest for 10 minutes.',
      'Grill the fish on a hot tawa or grill pan, brushing with the rest of the oil, for 4 to 5 minutes each side.',
      'Toss the sprouts with {cucumber} and {tomato} (both chopped), salt, lemon juice and chaat masala.',
    ],
    tip: 'Grilling needs far less oil than frying. Mustard oil adds the classic Bengali flavour.',
  },
  tandoori_chicken_salad: {
    prepMin: 15,
    cookMin: 25,
    ahead: 'Marinate for 30 minutes or more',
    method: 'Grilled or oven-baked',
    pantry: [...SALT_SPICE, 'tandoori masala', 'ginger-garlic paste', 'lemon juice', 'water'],
    steps: [
      'Make deep cuts in {chicken} and rub with lemon juice, salt, ginger-garlic paste, tandoori masala and half of {oil}. Marinate for at least 30 minutes.',
      'Grill on a hot tawa or grill pan, or bake at 220 °C for 20 to 25 minutes, turning once and brushing with the rest of the oil.',
      'Slice {cucumber}, {tomato} and {onion} for the salad and add lemon juice.',
      'Knead {atta} into a soft dough, roll out the rotis and cook them on a hot dry tawa.',
    ],
    tip: 'A lemon-and-spice marinade keeps the numbers exact. A curd marinade adds about 20 kcal per 2 tablespoons.',
  },

  // ---- Snacks ----
  fruit_almonds: {
    prepMin: 3,
    cookMin: 0,
    method: 'No cooking',
    pantry: [],
    steps: ['Wash and slice {apple}. Eat with the skin on for extra fibre.', 'Have it with {almond}.'],
    tip: 'Soaking almonds overnight makes them easier to digest.',
  },
  guava_peanuts: {
    prepMin: 3,
    cookMin: 5,
    method: 'Dry-roasted',
    pantry: ['salt', 'chaat masala'],
    steps: ['Dry-roast {peanut} in a pan for 4 to 5 minutes until crunchy.', 'Slice {guava} and sprinkle with chaat masala.'],
    tip: 'Guava is one of the richest sources of vitamin C and fibre among Indian fruits.',
  },
  milk_banana: {
    prepMin: 2,
    cookMin: 0,
    method: 'No cooking',
    pantry: [],
    steps: ['Have {milk}, warm or cold, with {banana}.'],
    tip: 'Skip sugar. The banana is sweet enough.',
  },
  sprouts_chaat: {
    prepMin: 10,
    cookMin: 5,
    ahead: 'Sprout the moong for 1 to 2 days, or buy sprouts',
    method: 'Steamed',
    pantry: ['salt', 'chaat masala', 'lemon juice', 'green chilli', 'coriander leaves'],
    steps: [
      'Soak {moong} overnight, drain and leave covered for a day to sprout. Steam the sprouts for 5 minutes.',
      { text: 'Mix with {onion}, {tomato} and {cucumber}, all chopped.', if: ['onion'] },
      { text: 'Mix with {tomato} and {cucumber}, both chopped.', unless: ['onion'] },
      'Add salt, chaat masala, lemon juice, green chilli and coriander.',
    ],
    tip: 'Lightly steaming the sprouts keeps them crunchy and makes them easier to digest.',
  },
  chana_peanut_mix: {
    prepMin: 5,
    cookMin: 25,
    ahead: 'Soak the chana overnight',
    method: 'Boiled',
    pantry: ['salt', 'chaat masala', 'lemon juice', 'coriander leaves'],
    steps: [
      'Soak {chana} overnight, then pressure-cook with salt for 5 to 6 whistles. Drain.',
      'Dry-roast {peanut} until crunchy.',
      { text: 'Mix the chana and peanuts with {onion} (chopped), chaat masala, lemon juice and coriander.', if: ['onion'] },
      { text: 'Mix the chana and peanuts with chaat masala, lemon juice and coriander.', unless: ['onion'] },
    ],
    tip: 'Boil a larger batch of chana and keep it in the fridge for up to 3 days.',
  },
  paneer_tikka_snack: {
    prepMin: 10,
    cookMin: 10,
    ahead: 'Marinate for 20 minutes',
    method: 'Grilled',
    pantry: [...SALT_SPICE, 'tandoori masala', 'lemon juice', 'chaat masala'],
    steps: [
      'Cut {paneer} into cubes and rub with lemon juice, salt and tandoori masala. Rest for 20 minutes.',
      { text: 'Cut {onion} into chunks and thread on skewers with the paneer, or keep loose.', if: ['onion'] },
      { text: 'Grill on a hot tawa or grill pan, brushing with {oil}, until charred at the edges.', if: ['oil'] },
      { text: 'Grill on a hot non-stick tawa or grill pan, without oil, until charred at the edges.', unless: ['oil'] },
      'Sprinkle chaat masala and serve.',
    ],
    tip: 'Paneer releases its own fat as it grills, so it needs little or no oil.',
  },
  sprouts_paneer_salad: {
    prepMin: 10,
    cookMin: 5,
    ahead: 'Sprout the moong for 1 to 2 days, or buy sprouts',
    method: 'Steamed',
    pantry: ['salt', 'black pepper', 'chaat masala', 'lemon juice'],
    steps: [
      'Soak {moong} overnight, drain and leave covered for a day to sprout. Steam the sprouts for 5 minutes.',
      'Cut {paneer} into small cubes.',
      'Toss with {cucumber} and {tomato} (both chopped), salt, pepper, chaat masala and lemon juice.',
    ],
    tip: 'A squeeze of lemon helps your body absorb the iron in the sprouts.',
  },
  roasted_chana_soya: {
    prepMin: 5,
    cookMin: 30,
    ahead: 'Soak overnight',
    method: 'Dry-roasted',
    pantry: ['salt', 'chaat masala', 'red chilli powder'],
    steps: [
      'Soak {chana} and {soyabean} overnight, then drain and pat completely dry.',
      'Roast in a dry heavy pan on low heat, stirring often, for 25 to 30 minutes until crunchy (or bake at 180 °C for 30 to 35 minutes).',
      'Toss with salt, chilli powder and chaat masala.',
    ],
    tip: 'Make a big batch and store it in an airtight jar. Weigh your portion out each time.',
  },
  chicken_tikka_snack: {
    prepMin: 10,
    cookMin: 15,
    ahead: 'Marinate for 30 minutes',
    method: 'Grilled',
    pantry: [...SALT_SPICE, 'tandoori masala', 'ginger-garlic paste', 'lemon juice'],
    steps: [
      'Cut {chicken} into cubes and rub with lemon juice, salt, ginger-garlic paste and tandoori masala. Marinate for 30 minutes.',
      { text: 'Cut {onion} into chunks and thread on skewers with the chicken.', if: ['onion'] },
      { text: 'Grill on a hot tawa or grill pan, brushing with {oil}, for 10 to 12 minutes, turning until cooked through.', if: ['oil'] },
      { text: 'Grill on a hot non-stick grill pan, or bake at 220 °C, for 12 to 15 minutes, turning until cooked through.', unless: ['oil'] },
    ],
    tip: 'Baking or air-frying works just as well and needs no oil.',
  },
  curd_fruit_bowl: {
    prepMin: 3,
    cookMin: 0,
    method: 'No cooking',
    pantry: ['a pinch of cinnamon (optional)'],
    steps: [
      'Spoon {curd} into a bowl.',
      { text: 'Top with {banana} (sliced).', if: ['banana'] },
      { text: 'Add {almond} (chopped).', if: ['almond'] },
    ],
    tip: 'Plain curd has no added sugar, unlike flavoured yoghurt cups.',
  },
  soya_chunk_chaat: {
    prepMin: 10,
    cookMin: 5,
    method: 'Boiled',
    pantry: ['salt', 'chaat masala', 'lemon juice', 'green chilli', 'coriander leaves'],
    steps: [
      'Boil {soya} in salted water for 5 minutes, then squeeze out the water.',
      { text: 'Mix with {onion}, {tomato} and {cucumber}, all chopped.', if: ['onion'] },
      { text: 'Mix with {tomato} and {cucumber}, both chopped.', unless: ['onion'] },
      'Add chaat masala, lemon juice, green chilli and coriander.',
    ],
    tip: 'A high-protein snack with almost no fat.',
  },
  boiled_eggs: {
    prepMin: 2,
    cookMin: 12,
    method: 'Boiled',
    pantry: ['salt', 'black pepper'],
    steps: [
      'Boil {egg} for 10 minutes, then cool in cold water and peel.',
      { text: 'Cook {eggwhite} in a non-stick pan without oil, stirring until set (or boil extra eggs and keep only the whites).', if: ['eggwhite'] },
      'Sprinkle with salt and pepper.',
    ],
    tip: 'Boil a few eggs at once and keep them in the fridge for up to 5 days.',
  },
};

export interface RecipeAmount {
  code: string;
  label: string;
  grams: number;
  /** E.g. "2 rotis", "1 tsp", "about 245 ml". */
  household?: string;
}

/** A step is a list of text pieces and ingredient amounts, so the app can bold the amounts. */
export type RecipePart = string | RecipeAmount;

export interface Recipe {
  dishId: string;
  servings: 1;
  prepMin: number;
  cookMin: number;
  ahead?: string;
  method: string;
  pantry: string[];
  steps: RecipePart[][];
  tip: string;
}

/** "2 rotis (60 g whole-wheat atta)", "5 g groundnut oil (1 tsp)", "150 g paneer". */
export function formatAmount(a: RecipeAmount): string {
  if (!a.household) return `${a.grams} g ${a.label}`;
  const unit = a.household.replace(/^[\d.½]+\s*/, '').replace(/s$/, '');
  if (a.label.includes(unit)) return `${a.household} (${a.grams} g)`;
  if (FATS.has(a.code) || MILKS.has(a.code)) return `${a.grams} g ${a.label} (${a.household})`;
  return `${a.household} (${a.grams} g ${a.label})`;
}

function householdOf(code: string, grams: number, planned?: string): string | undefined {
  if (planned) return planned;
  if (FATS.has(code)) {
    const tsp = Math.round((grams / 5) * 2) / 2;
    return tsp > 0 ? `${tsp} tsp` : undefined;
  }
  if (MILKS.has(code)) return `about ${Math.round(grams / 1.03 / 5) * 5} ml`;
  return undefined;
}

/**
 * The recipe for one planned meal, with every amount taken from the plan.
 * Steps for ingredients the meal does not include (optional extras the
 * solver left at 0 g, onion for a Jain diet) are left out.
 * Returns null for a dish without a recipe. `strict` (for tests) throws
 * instead of quietly dropping a step that names a missing ingredient.
 */
export function recipeFor(meal: PlannedMeal, dietType?: DietType, options: { strict?: boolean } = {}): Recipe | null {
  const template = RECIPES[meal.dishId];
  if (!template) return null;
  const jain = dietType === 'jain';

  const amountOf = (key: string): RecipeAmount | null => {
    const codes = KEYS[key];
    if (!codes) return null;
    const item = meal.items.find((it) => codes.includes(it.code) && it.grams > 0);
    if (!item) return null;
    const amount: RecipeAmount = { code: item.code, label: LABELS[item.code] ?? item.name, grams: item.grams };
    const household = householdOf(item.code, item.grams, item.household);
    if (household) amount.household = household;
    return amount;
  };
  const has = (key: string) => amountOf(key) !== null;

  const steps: RecipePart[][] = [];
  for (const raw of template.steps) {
    const step: StepTemplate = typeof raw === 'string' ? { text: raw } : raw;
    if (step.notJain && jain) continue;
    if (step.jainOnly && !jain) continue;
    if (step.if && !step.if.every(has)) continue;
    if (step.unless && step.unless.some(has)) continue;
    const parts = fillStep(step.text, amountOf);
    if (parts) steps.push(parts);
    else if (options.strict) throw new Error(`Recipe ${meal.dishId}: step "${step.text}" names an ingredient the meal does not have`);
  }

  return {
    dishId: meal.dishId,
    servings: 1,
    prepMin: template.prepMin,
    cookMin: template.cookMin,
    ...(template.ahead ? { ahead: template.ahead } : {}),
    method: template.method,
    pantry: template.pantry.filter((p) => !(jain && NOT_JAIN.has(p))),
    steps,
    tip: template.tip,
  };
}

/** Splits "Rinse {rice} and soak" into text and amounts; null if a key has no amount. */
function fillStep(text: string, amountOf: (key: string) => RecipeAmount | null): RecipePart[] | null {
  const parts: RecipePart[] = [];
  const re = /\{(\w+)\}/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const amount = amountOf(m[1]!);
    if (!amount) return null;
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(amount);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Every recipe key used in a template's steps (for tests). */
export function recipeKeys(dishId: string): string[] {
  const t = RECIPES[dishId];
  if (!t) return [];
  const keys = new Set<string>();
  for (const s of t.steps) {
    const text = typeof s === 'string' ? s : s.text;
    for (const m of text.matchAll(/\{(\w+)\}/g)) keys.add(m[1]!);
  }
  return [...keys];
}

export const RECIPE_KEYS = KEYS;
