-- Let admins see what one client has entered: assessment answers, weigh-ins,
-- weekly check-ins and logged workouts. One call returns it all, only for an
-- active admin, and every look is written to audit_logs
-- ('admin.view_user_inputs'), so the client's record shows who looked when.
-- Nothing here lets an admin change a client's data.
CREATE FUNCTION public.admin_user_inputs(target uuid) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  me uuid := public.require_admin('admin');
  latest_assessment uuid;
  result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = target) THEN
    RAISE EXCEPTION 'No such user' USING ERRCODE = 'no_data_found';
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, subject_user_id)
    VALUES (me, 'admin.view_user_inputs', 'users', target, target);

  SELECT id INTO latest_assessment FROM public.assessments WHERE user_id = target ORDER BY version DESC LIMIT 1;

  SELECT jsonb_build_object(
    'assessment', (
      SELECT jsonb_build_object(
        'status', a.status,
        'completed_at', a.completed_at,
        'updated_at', a.updated_at,
        'answers', coalesce((SELECT jsonb_object_agg(x.question_key, x.value) FROM public.assessment_answers x WHERE x.assessment_id = a.id), '{}'::jsonb)
      )
      FROM public.assessments a WHERE a.id = latest_assessment
    ),
    'weigh_ins', coalesce((
      SELECT jsonb_agg(jsonb_build_object('measured_at', m.measured_at, 'value', m.value, 'unit', m.unit, 'source', m.source, 'recorded_at', m.created_at)
        ORDER BY m.measured_at DESC)
      FROM public.body_measurements m WHERE m.user_id = target AND m.type = 'weight'
    ), '[]'::jsonb),
    'checkins', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'week_no', c.week_no, 'week_end', c.week_end, 'submitted_at', c.submitted_at,
          'days_logged', c.days_logged, 'diet_adherence_pct', c.diet_adherence_pct,
          'workout_adherence_pct', c.workout_adherence_pct, 'hunger', c.hunger, 'energy', c.energy,
          'sleep_quality', c.sleep_quality, 'recovery', c.recovery, 'satisfaction', c.satisfaction,
          'challenges', c.challenges, 'cycle_phase', c.cycle_phase)
        ORDER BY c.week_end DESC, c.submitted_at DESC)
      FROM public.weekly_checkins c WHERE c.user_id = target AND c.submitted_at IS NOT NULL
    ), '[]'::jsonb),
    'workouts', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'performed_on', w.performed_on, 'day_name', w.day_name, 'duration_min', w.duration_min,
          'effort', w.effort, 'exercises', w.exercises, 'notes', w.notes, 'completed_at', w.completed_at)
        ORDER BY w.performed_on DESC, w.completed_at DESC)
      FROM public.workout_sessions w WHERE w.user_id = target
    ), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.admin_user_inputs(uuid) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.admin_user_inputs(uuid) TO authenticated;
