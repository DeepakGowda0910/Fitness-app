/**
 * Everyday names for the ingredient list, e.g. "Carrot" instead of the IFCT
 * name "Carrot, orange" (which reads like the fruit). Display only: the food
 * codes, data and calculations are unchanged.
 */
const DISPLAY_NAMES: Readonly<Record<string, string>> = {
  A005: 'Jowar flour',
  A010: 'Ragi flour',
  A011: 'Poha (rice flakes)',
  A015: 'Rice (uncooked)',
  A019: 'Whole-wheat atta',
  A022: 'Rava (semolina)',
  B001: 'Chana dal / besan',
  B002: 'Kabuli chana (dry)',
  B003: 'Urad dal',
  B010: 'Moong dal',
  B011: 'Whole moong (dry)',
  B020: 'Rajma (dry)',
  B021: 'Toor dal',
  B025: 'Soya beans (dry)',
  C033: 'Spinach (palak)',
  D033: 'Capsicum',
  D036: 'Cauliflower',
  D043: 'Cucumber',
  D056: 'Okra (bhindi)',
  D061: 'Green peas',
  D066: 'Pumpkin',
  D075: 'Tomato',
  E001: 'Apple',
  E012: 'Banana',
  E028: 'Guava',
  E047: 'Orange',
  E049: 'Papaya',
  E051: 'Pear',
  E055: 'Pomegranate',
  F002: 'Carrot',
  G017: 'Onion',
  H001: 'Almonds',
  H007: 'Fresh coconut',
  H012: 'Peanuts',
  J001: 'Mushrooms',
  L002: 'Milk (whole)',
  L003: 'Paneer',
  M001: 'Eggs',
  M002: 'Egg whites',
  M004: 'Eggs (boiled)',
  N002: 'Chicken thigh (skinless)',
  N003: 'Chicken breast (skinless)',
  S006: 'Rohu fish',
  T001: 'Coconut oil',
  T005: 'Groundnut oil',
  T006: 'Mustard oil',
  T008: 'Rice bran oil',
  T012: 'Sunflower oil',
  T013: 'Ghee',
  'USDA:171284': 'Curd (dahi)',
  'USDA:170886': 'Low-fat curd',
  'USDA:172475': 'Tofu (firm)',
  'USDA:174275': 'Soya chunks (dry)',
};

/** The everyday name for a food code, or the given fallback (its reference name). */
export function displayName(code: string, fallback: string): string {
  return DISPLAY_NAMES[code] ?? fallback;
}

export function hasDisplayName(code: string): boolean {
  return code in DISPLAY_NAMES;
}
