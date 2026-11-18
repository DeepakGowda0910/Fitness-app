CREATE TYPE "public"."assessment_status" AS ENUM('draft', 'completed');--> statement-breakpoint
CREATE TYPE "public"."checkin_decision" AS ENUM('no_change', 'increase', 'decrease', 'hold_for_adherence', 'suggest_diet_break', 'at_floor');--> statement-breakpoint
CREATE TYPE "public"."checkin_status" AS ENUM('on_track', 'faster', 'slower', 'maintaining', 'drifting_up', 'drifting_down', 'plateau', 'adherence_issue', 'recovery_issue', 'insufficient_data');--> statement-breakpoint
CREATE TYPE "public"."consent_purpose" AS ENUM('health_data', 'ai_processing', 'coach_access', 'photos', 'marketing');--> statement-breakpoint
CREATE TYPE "public"."diet_type" AS ENUM('vegetarian', 'eggetarian', 'vegan', 'jain', 'pescatarian', 'non_vegetarian');--> statement-breakpoint
CREATE TYPE "public"."feasibility" AS ENUM('realistic', 'ambitious', 'unsafe');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'achieved', 'abandoned', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('fat_loss', 'recomposition', 'lean_gain', 'weight_gain', 'maintenance', 'strength', 'endurance');--> statement-breakpoint
CREATE TYPE "public"."measurement_source" AS ENUM('measured_device', 'measured_manual', 'professional', 'user_estimate', 'ai_estimate', 'wearable_sync');--> statement-breakpoint
CREATE TYPE "public"."measurement_type" AS ENUM('weight', 'body_fat_pct', 'skeletal_muscle_kg', 'visceral_fat', 'waist', 'hip', 'chest', 'arm', 'thigh', 'neck');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('clear', 'caution', 'refer');--> statement-breakpoint
CREATE TYPE "public"."sex_for_calculation" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."target_reason" AS ENUM('initial', 'checkin_adjustment', 'reassessment', 'coach_override');--> statement-breakpoint
CREATE TYPE "public"."unit_system" AS ENUM('metric', 'imperial');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TABLE "assessment_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"section" text NOT NULL,
	"question_key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "assessment_status" DEFAULT 'draft' NOT NULL,
	"current_step" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"subject_user_id" uuid,
	"ip" "inet",
	"diff_hash" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"type" "measurement_type" NOT NULL,
	"value" numeric(7, 2) NOT NULL,
	"unit" text NOT NULL,
	"source" "measurement_source" NOT NULL,
	"device" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "value_positive" CHECK ("body_measurements"."value" > 0)
);
--> statement-breakpoint
CREATE TABLE "checkin_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"checkin_id" uuid NOT NULL,
	"status" "checkin_status" NOT NULL,
	"decision" "checkin_decision" NOT NULL,
	"kcal_change" integer DEFAULT 0 NOT NULL,
	"trend_weight_kg" numeric(5, 2),
	"weekly_rate_pct" numeric(5, 2),
	"observed_tdee" integer,
	"rule_fired" text NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"engine_version" text NOT NULL,
	"new_target_id" uuid,
	"explanation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkin_assessments_checkin_id_unique" UNIQUE("checkin_id")
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "consent_purpose" NOT NULL,
	"granted" boolean NOT NULL,
	"policy_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dietary_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"diet_type" "diet_type" NOT NULL,
	"cuisines" text[] DEFAULT '{}'::text[] NOT NULL,
	"allergies" text[] DEFAULT '{}'::text[] NOT NULL,
	"intolerances" text[] DEFAULT '{}'::text[] NOT NULL,
	"dislikes" text[] DEFAULT '{}'::text[] NOT NULL,
	"meals_per_day" smallint DEFAULT 3 NOT NULL,
	"prep_minutes" smallint,
	"budget_per_day_inr" numeric(8, 2),
	"cooking_facilities" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meals_per_day_range" CHECK ("dietary_preferences"."meals_per_day" between 1 and 8)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"primary_goal" "goal_type" NOT NULL,
	"secondary_goals" text[] DEFAULT '{}'::text[] NOT NULL,
	"target_weight_kg" numeric(5, 1),
	"target_body_fat_pct" numeric(4, 1),
	"target_date" date,
	"weekly_rate_pct" numeric(4, 2),
	"feasibility" "feasibility",
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_screenings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"requires_doctor_review" boolean DEFAULT false NOT NULL,
	"engine_version" text NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_screenings_assessment_id_unique" UNIQUE("assessment_id")
);
--> statement-breakpoint
CREATE TABLE "nutrition_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"effective_from" date NOT NULL,
	"bmr" integer NOT NULL,
	"tdee" integer NOT NULL,
	"calories" integer NOT NULL,
	"protein_g" integer NOT NULL,
	"carbs_g" integer NOT NULL,
	"fat_g" integer NOT NULL,
	"fibre_g" integer NOT NULL,
	"water_ml" integer NOT NULL,
	"formula_used" text NOT NULL,
	"inputs_snapshot" jsonb NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"engine_version" text NOT NULL,
	"reason" "target_reason" NOT NULL,
	"approved_by" uuid,
	"supersedes_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calories_positive" CHECK ("nutrition_targets"."calories" > 0),
	CONSTRAINT "macros_non_negative" CHECK ("nutrition_targets"."protein_g" >= 0 and "nutrition_targets"."carbs_g" >= 0 and "nutrition_targets"."fat_g" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"date_of_birth" date,
	"sex_for_calculation" "sex_for_calculation",
	"height_cm" numeric(5, 1),
	"country" text DEFAULT 'IN' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "height_range" CHECK ("user_profiles"."height_cm" is null or "user_profiles"."height_cm" between 120 and 230)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_provider_id" text NOT NULL,
	"email" text NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"locale" text DEFAULT 'en-IN' NOT NULL,
	"units" "unit_system" DEFAULT 'metric' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_provider_id_unique" UNIQUE("auth_provider_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weekly_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_no" integer NOT NULL,
	"week_end" date NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"weight_avg_kg" numeric(5, 2),
	"steps_avg" integer,
	"workout_adherence_pct" smallint,
	"diet_adherence_pct" smallint,
	"days_logged" smallint,
	"avg_intake_kcal" integer,
	"energy" smallint,
	"hunger" smallint,
	"sleep_quality" smallint,
	"recovery" smallint,
	"satisfaction" smallint,
	"challenges" text,
	"cycle_phase" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adherence_range" CHECK (coalesce("weekly_checkins"."diet_adherence_pct", 0) between 0 and 100 and coalesce("weekly_checkins"."workout_adherence_pct", 0) between 0 and 100),
	CONSTRAINT "days_logged_range" CHECK (coalesce("weekly_checkins"."days_logged", 0) between 0 and 7),
	CONSTRAINT "scales_range" CHECK (coalesce("weekly_checkins"."energy", 1) between 1 and 5 and coalesce("weekly_checkins"."hunger", 1) between 1 and 5 and coalesce("weekly_checkins"."sleep_quality", 1) between 1 and 5 and coalesce("weekly_checkins"."recovery", 1) between 1 and 5 and coalesce("weekly_checkins"."satisfaction", 1) between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_assessments" ADD CONSTRAINT "checkin_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_assessments" ADD CONSTRAINT "checkin_assessments_checkin_id_weekly_checkins_id_fk" FOREIGN KEY ("checkin_id") REFERENCES "public"."weekly_checkins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_assessments" ADD CONSTRAINT "checkin_assessments_new_target_id_nutrition_targets_id_fk" FOREIGN KEY ("new_target_id") REFERENCES "public"."nutrition_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dietary_preferences" ADD CONSTRAINT "dietary_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_screenings" ADD CONSTRAINT "health_screenings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_screenings" ADD CONSTRAINT "health_screenings_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_supersedes_id_nutrition_targets_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."nutrition_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_checkins" ADD CONSTRAINT "weekly_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_answers_question_uq" ON "assessment_answers" USING btree ("assessment_id","question_key");--> statement-breakpoint
CREATE UNIQUE INDEX "assessments_user_version_uq" ON "assessments" USING btree ("user_id","version");--> statement-breakpoint
CREATE INDEX "audit_logs_subject_idx" ON "audit_logs" USING btree ("subject_user_id","at");--> statement-breakpoint
CREATE INDEX "body_measurements_user_type_idx" ON "body_measurements" USING btree ("user_id","type","measured_at");--> statement-breakpoint
CREATE INDEX "consents_user_purpose_idx" ON "consents" USING btree ("user_id","purpose","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dietary_preferences_user_version_uq" ON "dietary_preferences" USING btree ("user_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "nutrition_targets_user_version_uq" ON "nutrition_targets" USING btree ("user_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_checkins_user_week_uq" ON "weekly_checkins" USING btree ("user_id","week_end");