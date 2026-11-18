-- Let a super admin make another user an admin, or remove that role, from
-- the admin site. Granting super_admin, and changing your own or another
-- super admin's role, still happen only in the Supabase SQL editor
-- (grant_admin_role in 0006).
CREATE FUNCTION public.admin_set_role(target uuid, new_role public.admin_role) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  me uuid := public.require_admin('super_admin');
  current_role_of_target public.admin_role;
BEGIN
  IF new_role IS NOT NULL AND new_role <> 'admin' THEN
    RAISE EXCEPTION 'Super admin can only be granted in the Supabase SQL editor' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF target = me THEN
    RAISE EXCEPTION 'You can''t change your own role here' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT role INTO current_role_of_target FROM public.admin_roles WHERE user_id = target;
  IF current_role_of_target = 'super_admin' THEN
    RAISE EXCEPTION 'Super admin accounts can only be changed in the Supabase SQL editor' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = target AND status = 'active') THEN
    RAISE EXCEPTION 'Only an active account can be given a role' USING ERRCODE = 'no_data_found';
  END IF;
  IF new_role IS NULL THEN
    DELETE FROM public.admin_roles WHERE user_id = target;
  ELSE
    INSERT INTO public.admin_roles (user_id, role) VALUES (target, 'admin') ON CONFLICT (user_id) DO NOTHING;
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, subject_user_id)
    VALUES (me, CASE WHEN new_role IS NULL THEN 'admin.revoke_role' ELSE 'admin.grant_role:admin' END, 'admin_roles', target, target);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.admin_set_role(uuid, public.admin_role) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.admin_role) TO authenticated;
