-- Workouts belong to their user: they can read, add and remove their own,
-- and nobody else's. Suspended users lose access (app_user_id() is null).
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY workout_sessions_owner ON workout_sessions FOR ALL TO authenticated USING (user_id = public.app_user_id()) WITH CHECK (user_id = public.app_user_id());
