import { describe, expect, it } from 'vitest';
import { describeAction, filterUsers, type AdminUser } from '../lib/admin';

const user = (email: string, status: AdminUser['status']): AdminUser => ({
  id: email,
  email,
  status,
  admin_role: null,
  joined_at: '2026-11-18T00:00:00Z',
  last_sign_in_at: null,
  onboarding: 'not_started',
  checkins: 0,
  last_checkin_at: null,
});

describe('admin helpers', () => {
  const users = [user('asha@example.com', 'active'), user('ravi@example.com', 'suspended'), user('Arjun@Mail.com', 'active')];

  it('filters by email text, ignoring case, and by status', () => {
    expect(filterUsers(users, 'A', 'all').map((u) => u.email)).toEqual(['asha@example.com', 'ravi@example.com', 'Arjun@Mail.com']);
    expect(filterUsers(users, 'mail.com', 'all').map((u) => u.email)).toEqual(['Arjun@Mail.com']);
    expect(filterUsers(users, '', 'suspended').map((u) => u.email)).toEqual(['ravi@example.com']);
  });

  it('describes audit entries in plain words, without exposing deleted accounts', () => {
    const base = { at: '', actor_email: 'me@example.com', subject_user_id: 'x' };
    expect(describeAction({ ...base, action: 'admin.suspend_user', subject_email: 'ravi@example.com' })).toBe('Suspended ravi@example.com');
    expect(describeAction({ ...base, action: 'admin.delete_user', subject_email: null })).toBe('Deleted an account');
    expect(describeAction({ ...base, action: 'admin.list_users', subject_email: null })).toBe('Viewed the user list');
  });
});
