CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"performed_on" date NOT NULL,
	"day_key" text NOT NULL,
	"day_name" text NOT NULL,
	"planner_version" text NOT NULL,
	"duration_min" smallint,
	"effort" smallint,
	"exercises" jsonb NOT NULL,
	"notes" text,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "effort_range" CHECK (coalesce("workout_sessions"."effort", 1) between 1 and 5),
	CONSTRAINT "duration_range" CHECK (coalesce("workout_sessions"."duration_min", 1) between 1 and 600),
	CONSTRAINT "exercises_is_array" CHECK (jsonb_typeof("workout_sessions"."exercises") = 'array')
);
--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_sessions_user_date_idx" ON "workout_sessions" USING btree ("user_id","performed_on");