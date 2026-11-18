import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Admin calls. Each is a database function (packages/db/migrations/0006_admin_access.sql)
 * that checks the caller's role itself and writes the audit log, so nothing
 * here needs, or could use, a secret key.
 */

export type AdminRole = 'super_admin' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type Onboarding = 'not_started' | 'in_progress' | 'completed';

export interface AdminUser {
  id: string;
  email: string;
  status: UserStatus;
  admin_role: AdminRole | null;
  joined_at: string;
  last_sign_in_at: string | null;
  onboarding: Onboarding;
  checkins: number;
  last_checkin_at: string | null;
}

export interface AdminAction {
  at: string;
  actor_email: string | null;
  action: string;
  subject_user_id: string | null;
  subject_email: string | null;
}

export const ONBOARDING_LABEL: Record<Onboarding, string> = {
  not_started: 'Not started',
  in_progress: 'Answering questions',
  completed: 'Has targets',
};

const ACTION_LABEL: Record<string, string> = {
  'admin.list_users': 'Viewed the user list',
  'admin.suspend_user': 'Suspended',
  'admin.reactivate_user': 'Reactivated',
  'admin.delete_user': 'Deleted',
  'admin.revoke_role': 'Removed admin role from',
  'admin.grant_role:admin': 'Made admin:',
  'admin.grant_role:super_admin': 'Made super admin:',
};

/** "Suspended client@example.com"; once an account is deleted its email is no longer shown. */
export function describeAction(a: AdminAction): string {
  const verb = ACTION_LABEL[a.action] ?? a.action.replace(/^admin\./, '').replaceAll('_', ' ');
  if (a.action === 'admin.list_users') return verb;
  if (a.subject_email) return `${verb} ${a.subject_email}`;
  // The account is gone, and its email with it.
  return a.action === 'admin.delete_user' ? 'Deleted an account' : `${verb} an account that was later deleted`;
}

/** Users that match a search and a status filter. */
export function filterUsers(users: AdminUser[], query: string, status: 'all' | UserStatus): AdminUser[] {
  const q = query.trim().toLowerCase();
  return users.filter((u) => (status === 'all' || u.status === status) && (!q || u.email.toLowerCase().includes(q)));
}

function fail(what: string, error: { message: string }): never {
  throw new Error(`Could not ${what}: ${error.message}`);
}

/** The signed-in user's role, or null (also when the database has no admin area yet). */
export async function myAdminRole(db: SupabaseClient): Promise<AdminRole | null> {
  const { data, error } = await db.rpc('my_admin_role');
  if (error) return null;
  return (data as AdminRole | null) ?? null;
}

export async function listUsers(db: SupabaseClient): Promise<AdminUser[]> {
  const { data, error } = await db.rpc('admin_list_users');
  if (error) fail('load users', error);
  return (data ?? []) as AdminUser[];
}

export async function recentActions(db: SupabaseClient, maxRows = 30): Promise<AdminAction[]> {
  const { data, error } = await db.rpc('admin_recent_actions', { max_rows: maxRows });
  if (error) fail('load recent activity', error);
  return (data ?? []) as AdminAction[];
}

export async function setUserStatus(db: SupabaseClient, userId: string, status: 'active' | 'suspended'): Promise<void> {
  const { error } = await db.rpc('admin_set_user_status', { target: userId, new_status: status });
  if (error) fail(status === 'suspended' ? 'suspend this user' : 'reactivate this user', error);
}

export async function deleteUser(db: SupabaseClient, userId: string, confirmEmail: string): Promise<void> {
  const { error } = await db.rpc('admin_delete_user', { target: userId, confirm_email: confirmEmail });
  if (error) fail('delete this user', error);
}

export async function setRole(db: SupabaseClient, userId: string, role: 'admin' | null): Promise<void> {
  const { error } = await db.rpc('admin_set_role', { target: userId, new_role: role });
  if (error) fail(role ? 'make this user an admin' : 'remove the admin role', error);
}

export type ActionKind = 'suspend' | 'reactivate' | 'make_admin' | 'remove_admin' | 'delete';

/**
 * What the signed-in admin may do to this account, and if something is held
 * back, why. The database enforces the same rules; this only decides which
 * buttons to show.
 */
export function allowedActions(user: AdminUser, myRole: AdminRole, myEmail: string): { actions: ActionKind[]; note: string | null } {
  if (user.email.toLowerCase() === myEmail.toLowerCase()) {
    return { actions: [], note: "This is your own account. It can't be changed here, so you can't lock yourself out by accident." };
  }
  if (user.admin_role === 'super_admin') {
    return { actions: [], note: 'Super admin accounts can only be changed in the Supabase SQL editor.' };
  }
  if (user.admin_role === 'admin') {
    return myRole === 'super_admin'
      ? { actions: ['remove_admin'], note: 'To suspend or delete this account, remove its admin role first.' }
      : { actions: [], note: 'Only a super admin can change another admin.' };
  }
  const actions: ActionKind[] = [user.status === 'suspended' ? 'reactivate' : 'suspend'];
  if (myRole === 'super_admin') {
    if (user.status === 'active') actions.push('make_admin');
    actions.push('delete');
  }
  return { actions, note: myRole === 'super_admin' ? null : 'Only a super admin can delete accounts or make admins.' };
}
