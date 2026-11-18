/**
 * Phase 1 database schema.
 *
 * Rules (see the design doc, section 3):
 * - Every user-data row has user_id and is deleted with the user (data rights).
 * - Targets, consents, audit logs and check-in assessments are append-only:
 *   a database trigger (migrations/0001_append_only.sql) rejects UPDATE.
 * - Every measurement records its source, so estimates are never shown as measured.
 * - Row-level security is added once the hosting provider is chosen, because
 *   it depends on how that provider exposes the signed-in user.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
const userId = () =>
  uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' });

// ---------- Enums ----------

export const userStatus = pgEnum('user_status', ['active', 'suspended', 'deleted']);
/** Staff roles for the admin area. Trainer and nutritionist roles come in Phase 4. */
export const adminRole = pgEnum('admin_role', ['super_admin', 'admin']);
export const unitSystem = pgEnum('unit_system', ['metric', 'imperial']);
export const sexForCalculation = pgEnum('sex_for_calculation', ['male', 'female']);
export const consentPurpose = pgEnum('consent_purpose', [
  'health_data',
  'ai_processing',
  'coach_access',
  'photos',
  'marketing',
]);
export const assessmentStatus = pgEnum('assessment_status', ['draft', 'completed']);
export const riskLevel = pgEnum('risk_level', ['clear', 'caution', 'refer']);
export const dietType = pgEnum('diet_type', [
  'vegetarian',
  'eggetarian',
  'vegan',
  'jain',
  'pescatarian',
  'non_vegetarian',
]);
export const goalType = pgEnum('goal_type', [
  'fat_loss',
  'recomposition',
  'lean_gain',
  'weight_gain',
  'maintenance',
  'strength',
  'endurance',
]);
export const feasibility = pgEnum('feasibility', ['realistic', 'ambitious', 'unsafe']);
export const goalStatus = pgEnum('goal_status', ['active', 'achieved', 'abandoned', 'superseded']);
export const measurementType = pgEnum('measurement_type', [
  'weight',
  'body_fat_pct',
  'skeletal_muscle_kg',
  'visceral_fat',
  'waist',
  'hip',
  'chest',
  'arm',
  'thigh',
  'neck',
]);
export const measurementSource = pgEnum('measurement_source', [
  'measured_device',
  'measured_manual',
  'professional',
  'user_estimate',
  'ai_estimate',
  'wearable_sync',
]);
export const targetReason = pgEnum('target_reason', [
  'initial',
  'checkin_adjustment',
  'reassessment',
  'coach_override',
]);
export const checkinStatus = pgEnum('checkin_status', [
  'on_track',
  'faster',
  'slower',
  'maintaining',
  'drifting_up',
  'drifting_down',
  'plateau',
  'adherence_issue',
  'recovery_issue',
  'insufficient_data',
]);
export const checkinDecision = pgEnum('checkin_decision', [
  'no_change',
  'increase',
  'decrease',
  'hold_for_adherence',
  'suggest_diet_break',
  'at_floor',
]);

// ---------- Identity, consent, audit ----------

export const users = pgTable('users', {
  id: id(),
  authProviderId: text('auth_provider_id').notNull().unique(),
  email: text('email').notNull().unique(),
  status: userStatus('status').notNull().default('active'),
  locale: text('locale').notNull().default('en-IN'),
  units: unitSystem('units').notNull().default('metric'),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Append-only. Withdrawing consent is a new row with granted = false. */
export const consents = pgTable(
  'consents',
  {
    id: id(),
    userId: userId(),
    purpose: consentPurpose('purpose').notNull(),
    granted: boolean('granted').notNull(),
    policyVersion: text('policy_version').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('consents_user_purpose_idx').on(t.userId, t.purpose, t.createdAt)],
);

/**
 * Who may use the admin area. Granted only from the Supabase SQL editor with
 * grant_admin_role(); nobody can read or change it through the Data API
 * (migrations/0006_admin_access.sql).
 */
export const adminRoles = pgTable('admin_roles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: adminRole('role').notNull(),
  createdAt: createdAt(),
});

/** Append-only. Not cascaded: kept (with subject anonymised) after account deletion. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: uuid('entity_id'),
    subjectUserId: uuid('subject_user_id'),
    ip: inet('ip'),
    diffHash: text('diff_hash'),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_logs_subject_idx').on(t.subjectUserId, t.at)],
);

// ---------- Profile and assessment ----------

export const userProfiles = pgTable(
  'user_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    fullName: text('full_name'),
    /** Age is always derived from this, never stored. */
    dateOfBirth: date('date_of_birth'),
    sexForCalculation: sexForCalculation('sex_for_calculation'),
    heightCm: numeric('height_cm', { precision: 5, scale: 1, mode: 'number' }),
    country: text('country').notNull().default('IN'),
    language: text('language').notNull().default('en'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check('height_range', sql`${t.heightCm} is null or ${t.heightCm} between 120 and 230`)],
);

export const assessments = pgTable(
  'assessments',
  {
    id: id(),
    userId: userId(),
    version: integer('version').notNull(),
    status: assessmentStatus('status').notNull().default('draft'),
    currentStep: text('current_step'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('assessments_user_version_uq').on(t.userId, t.version)],
);

export const assessmentAnswers = pgTable(
  'assessment_answers',
  {
    id: id(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    section: text('section').notNull(),
    questionKey: text('question_key').notNull(),
    value: jsonb('value').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('assessment_answers_question_uq').on(t.assessmentId, t.questionKey)],
);

export const healthScreenings = pgTable('health_screenings', {
  id: id(),
  userId: userId(),
  assessmentId: uuid('assessment_id')
    .notNull()
    .unique()
    .references(() => assessments.id, { onDelete: 'cascade' }),
  riskLevel: riskLevel('risk_level').notNull(),
  flags: text('flags').array().notNull().default(sql`'{}'::text[]`),
  requiresDoctorReview: boolean('requires_doctor_review').notNull().default(false),
  engineVersion: text('engine_version').notNull(),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const dietaryPreferences = pgTable(
  'dietary_preferences',
  {
    id: id(),
    userId: userId(),
    version: integer('version').notNull(),
    dietType: dietType('diet_type').notNull(),
    cuisines: text('cuisines').array().notNull().default(sql`'{}'::text[]`),
    allergies: text('allergies').array().notNull().default(sql`'{}'::text[]`),
    intolerances: text('intolerances').array().notNull().default(sql`'{}'::text[]`),
    dislikes: text('dislikes').array().notNull().default(sql`'{}'::text[]`),
    mealsPerDay: smallint('meals_per_day').notNull().default(3),
    prepMinutes: smallint('prep_minutes'),
    budgetPerDayInr: numeric('budget_per_day_inr', { precision: 8, scale: 2, mode: 'number' }),
    cookingFacilities: text('cooking_facilities').array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('dietary_preferences_user_version_uq').on(t.userId, t.version),
    check('meals_per_day_range', sql`${t.mealsPerDay} between 1 and 8`),
  ],
);

// ---------- Goals, measurements, targets ----------

export const goals = pgTable('goals', {
  id: id(),
  userId: userId(),
  primaryGoal: goalType('primary_goal').notNull(),
  secondaryGoals: text('secondary_goals').array().notNull().default(sql`'{}'::text[]`),
  targetWeightKg: numeric('target_weight_kg', { precision: 5, scale: 1, mode: 'number' }),
  targetBodyFatPct: numeric('target_body_fat_pct', { precision: 4, scale: 1, mode: 'number' }),
  targetDate: date('target_date'),
  weeklyRatePct: numeric('weekly_rate_pct', { precision: 4, scale: 2, mode: 'number' }),
  feasibility: feasibility('feasibility'),
  status: goalStatus('status').notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** One row per value (long format) so any measure can be trended. */
export const bodyMeasurements = pgTable(
  'body_measurements',
  {
    id: id(),
    userId: userId(),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    type: measurementType('type').notNull(),
    value: numeric('value', { precision: 7, scale: 2, mode: 'number' }).notNull(),
    unit: text('unit').notNull(),
    source: measurementSource('source').notNull(),
    device: text('device'),
    createdAt: createdAt(),
  },
  (t) => [
    index('body_measurements_user_type_idx').on(t.userId, t.type, t.measuredAt),
    check('value_positive', sql`${t.value} > 0`),
  ],
);

/** Immutable. A new version supersedes the old one; every number keeps its inputs and engine version. */
export const nutritionTargets = pgTable(
  'nutrition_targets',
  {
    id: id(),
    userId: userId(),
    version: integer('version').notNull(),
    effectiveFrom: date('effective_from').notNull(),
    bmr: integer('bmr').notNull(),
    tdee: integer('tdee').notNull(),
    calories: integer('calories').notNull(),
    proteinG: integer('protein_g').notNull(),
    carbsG: integer('carbs_g').notNull(),
    fatG: integer('fat_g').notNull(),
    fibreG: integer('fibre_g').notNull(),
    waterMl: integer('water_ml').notNull(),
    formulaUsed: text('formula_used').notNull(),
    inputsSnapshot: jsonb('inputs_snapshot').notNull(),
    assumptions: jsonb('assumptions').notNull().default(sql`'[]'::jsonb`),
    warnings: jsonb('warnings').notNull().default(sql`'[]'::jsonb`),
    engineVersion: text('engine_version').notNull(),
    reason: targetReason('reason').notNull(),
    approvedBy: uuid('approved_by'),
    supersedesId: uuid('supersedes_id').references((): AnyPgColumn => nutritionTargets.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('nutrition_targets_user_version_uq').on(t.userId, t.version),
    check('calories_positive', sql`${t.calories} > 0`),
    check('macros_non_negative', sql`${t.proteinG} >= 0 and ${t.carbsG} >= 0 and ${t.fatG} >= 0`),
  ],
);

// ---------- Check-ins ----------

export const weeklyCheckins = pgTable(
  'weekly_checkins',
  {
    id: id(),
    userId: userId(),
    weekNo: integer('week_no').notNull(),
    weekEnd: date('week_end').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    weightAvgKg: numeric('weight_avg_kg', { precision: 5, scale: 2, mode: 'number' }),
    stepsAvg: integer('steps_avg'),
    workoutAdherencePct: smallint('workout_adherence_pct'),
    dietAdherencePct: smallint('diet_adherence_pct'),
    daysLogged: smallint('days_logged'),
    avgIntakeKcal: integer('avg_intake_kcal'),
    energy: smallint('energy'),
    hunger: smallint('hunger'),
    sleepQuality: smallint('sleep_quality'),
    recovery: smallint('recovery'),
    satisfaction: smallint('satisfaction'),
    challenges: text('challenges'),
    cyclePhase: text('cycle_phase'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('weekly_checkins_user_week_uq').on(t.userId, t.weekEnd),
    check('adherence_range', sql`coalesce(${t.dietAdherencePct}, 0) between 0 and 100 and coalesce(${t.workoutAdherencePct}, 0) between 0 and 100`),
    check('days_logged_range', sql`coalesce(${t.daysLogged}, 0) between 0 and 7`),
    check(
      'scales_range',
      sql`coalesce(${t.energy}, 1) between 1 and 5 and coalesce(${t.hunger}, 1) between 1 and 5 and coalesce(${t.sleepQuality}, 1) between 1 and 5 and coalesce(${t.recovery}, 1) between 1 and 5 and coalesce(${t.satisfaction}, 1) between 1 and 5`,
    ),
  ],
);

/** Immutable record of the engine's decision for one check-in. */
export const checkinAssessments = pgTable('checkin_assessments', {
  id: id(),
  userId: userId(),
  checkinId: uuid('checkin_id')
    .notNull()
    .unique()
    .references(() => weeklyCheckins.id, { onDelete: 'cascade' }),
  status: checkinStatus('status').notNull(),
  decision: checkinDecision('decision').notNull(),
  kcalChange: integer('kcal_change').notNull().default(0),
  trendWeightKg: numeric('trend_weight_kg', { precision: 5, scale: 2, mode: 'number' }),
  weeklyRatePct: numeric('weekly_rate_pct', { precision: 5, scale: 2, mode: 'number' }),
  observedTdee: integer('observed_tdee'),
  ruleFired: text('rule_fired').notNull(),
  reasons: jsonb('reasons').notNull().default(sql`'[]'::jsonb`),
  engineVersion: text('engine_version').notNull(),
  newTargetId: uuid('new_target_id').references(() => nutritionTargets.id),
  /** Plain-language explanation shown to the user. */
  explanation: text('explanation'),
  createdAt: createdAt(),
});

// ---------- Food reference data ----------

export const foodSourceCode = pgEnum('food_source_code', ['IFCT_2017', 'USDA_FDC', 'OFF', 'CUSTOM']);
export const foodState = pgEnum('food_state', ['raw', 'cooked', 'processed']);

/** Where food data came from, with its licence, so every number is traceable. */
export const foodSources = pgTable('food_sources', {
  id: id(),
  code: foodSourceCode('code').notNull().unique(),
  name: text('name').notNull(),
  version: text('version').notNull(),
  licence: text('licence').notNull(),
  createdAt: createdAt(),
});

/** Reference foods, nutrients per 100 g edible portion. Readable by everyone signed in. */
export const foods = pgTable(
  'foods',
  {
    id: id(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => foodSources.id),
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    localNames: text('local_names').array().notNull().default(sql`'{}'::text[]`),
    foodGroup: text('food_group').notNull(),
    state: foodState('state').notNull().default('raw'),
    vegetarian: boolean('vegetarian').notNull(),
    eggetarian: boolean('eggetarian').notNull(),
    pescatarian: boolean('pescatarian').notNull(),
    verified: boolean('verified').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('foods_source_external_uq').on(t.sourceId, t.externalId),
    index('foods_name_idx').on(t.name),
  ],
);

/** One row per nutrient, e.g. protein_g, calcium_mg. Amounts per 100 g. */
export const foodNutrients = pgTable(
  'food_nutrients',
  {
    foodId: uuid('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    nutrientCode: text('nutrient_code').notNull(),
    amountPer100g: numeric('amount_per_100g', { precision: 10, scale: 3, mode: 'number' }).notNull(),
  },
  (t) => [
    uniqueIndex('food_nutrients_pk').on(t.foodId, t.nutrientCode),
    check('amount_non_negative', sql`${t.amountPer100g} >= 0`),
  ],
);

/** Household measures for Indian serving sizes ("1 katori", "1 roti"). */
export const foodPortions = pgTable(
  'food_portions',
  {
    id: id(),
    foodId: uuid('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    grams: numeric('grams', { precision: 7, scale: 1, mode: 'number' }).notNull(),
  },
  (t) => [uniqueIndex('food_portions_label_uq').on(t.foodId, t.label), check('grams_positive', sql`${t.grams} > 0`)],
);
