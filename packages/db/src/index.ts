export * as schema from './schema.js';
export * from './schema.js';

/** Tables that reject UPDATE (enforced by a trigger in the migrations). */
export const APPEND_ONLY_TABLES = ['consents', 'audit_logs', 'nutrition_targets', 'checkin_assessments'] as const;
export { withUser } from './with-user.js';
export { seedIfct2017, type ReferenceFoodInput } from './seed-foods.js';
