-- Row-level security for Supabase.
--
-- The API runs each request inside a transaction as the `authenticated` role
-- with the caller's JWT claims set (see src/with-user.ts), so these policies
-- are a second wall behind the API's own checks. Supabase provides the
-- `authenticated` role and `auth.uid()`. The server-side service role bypasses
-- RLS and is used only for engine writes (targets, screenings, check-in
-- decisions) and account deletion.

-- The app's user id for the signed-in Supabase user.
CREATE OR REPLACE FUNCTION public.app_user_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.users WHERE auth_provider_id = auth.uid()::text
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.app_user_id() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.app_user_id() TO authenticated;
--> statement-breakpoint
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY users_select_own ON users FOR SELECT TO authenticated USING (auth_provider_id = auth.uid()::text);
--> statement-breakpoint
CREATE POLICY users_insert_own ON users FOR INSERT TO authenticated WITH CHECK (auth_provider_id = auth.uid()::text);
--> statement-breakpoint
CREATE POLICY users_update_own ON users FOR UPDATE TO authenticated USING (auth_provider_id = auth.uid()::text) WITH CHECK (auth_provider_id = auth.uid()::text);
--> statement-breakpoint
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY user_profiles_owner ON user_profiles FOR ALL TO authenticated USING (user_id = public.app_user_id()) WITH CHECK (user_id = public.app_user_id());
--> statement-breakpoint
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY assessments_owner ON assessments FOR ALL TO authenticated USING (user_id = public.app_user_id()) WITH CHECK (user_id = public.app_user_id());
--> statement-breakpoint
ALTER TABLE dietary_preferences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY dietary_preferences_owner ON dietary_preferences FOR ALL TO authenticated USING (user_id = public.app_user_id()) WITH CHECK (user_id = public.app_user_id());
--> statement-breakpoint
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY goals_owner ON goals FOR ALL TO authenticated USING (user_id = public.app_user_id()) WITH CHECK (user_id = public.app_user_id());
--> statement-breakpoint
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY body_measurements_owner ON body_measurements FOR ALL TO authenticated USING (user_id = public.app_user_id()) WITH CHECK (user_id = public.app_user_id());
--> statement-breakpoint
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY weekly_checkins_owner ON weekly_checkins FOR ALL TO authenticated USING (user_id = public.app_user_id()) WITH CHECK (user_id = public.app_user_id());
--> statement-breakpoint
-- Answers belong to an assessment; ownership is checked through it.
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY assessment_answers_owner ON assessment_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM assessments a WHERE a.id = assessment_id AND a.user_id = public.app_user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM assessments a WHERE a.id = assessment_id AND a.user_id = public.app_user_id()));
--> statement-breakpoint
-- Written only by the engine (service role); users can read their own.
ALTER TABLE health_screenings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY health_screenings_read_own ON health_screenings FOR SELECT TO authenticated USING (user_id = public.app_user_id());
--> statement-breakpoint
-- Written only by the engine (service role); users can read their own.
ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY nutrition_targets_read_own ON nutrition_targets FOR SELECT TO authenticated USING (user_id = public.app_user_id());
--> statement-breakpoint
-- Written only by the engine (service role); users can read their own.
ALTER TABLE checkin_assessments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY checkin_assessments_read_own ON checkin_assessments FOR SELECT TO authenticated USING (user_id = public.app_user_id());
--> statement-breakpoint
-- Consents: users read and add their own; history is never edited or removed by them.
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY consents_read_own ON consents FOR SELECT TO authenticated USING (user_id = public.app_user_id());
--> statement-breakpoint
CREATE POLICY consents_insert_own ON consents FOR INSERT TO authenticated WITH CHECK (user_id = public.app_user_id());
--> statement-breakpoint
-- Audit log: users can see who accessed their data; only the server writes it.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY audit_logs_read_own ON audit_logs FOR SELECT TO authenticated USING (subject_user_id = public.app_user_id());
