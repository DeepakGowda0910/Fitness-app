import { describe, expect, it } from 'vitest';
import { allowedActions, describeAction, filterUsers, type AdminUser } from '../lib/admin';
import { answerRows, HUNGER, scaleLabel, setLabel, workoutVolumeKg } from '../lib/client-inputs';

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

describe('allowedActions', () => {
  const base = user('client@example.com', 'active');
  it('offers everything a super admin may do to a regular user', () => {
    expect(allowedActions(base, 'super_admin', 'me@example.com')).toEqual({ actions: ['suspend', 'make_admin', 'delete'], note: null });
    expect(allowedActions({ ...base, status: 'suspended' }, 'super_admin', 'me@example.com').actions).toEqual(['reactivate', 'delete']);
  });
  it('limits an admin to suspend and reactivate, and says why', () => {
    const r = allowedActions(base, 'admin', 'me@example.com');
    expect(r.actions).toEqual(['suspend']);
    expect(r.note).toMatch(/super admin/);
  });
  it('explains instead of hiding when nothing can be done', () => {
    expect(allowedActions({ ...base, email: 'Me@Example.com' }, 'super_admin', 'me@example.com').note).toMatch(/your own account/);
    expect(allowedActions({ ...base, admin_role: 'super_admin' }, 'super_admin', 'me@example.com').note).toMatch(/SQL editor/);
    expect(allowedActions({ ...base, admin_role: 'admin' }, 'super_admin', 'me@example.com').actions).toEqual(['remove_admin']);
    expect(allowedActions({ ...base, admin_role: 'admin' }, 'admin', 'me@example.com').actions).toEqual([]);
  });
});

describe('client inputs labels', () => {
  it('groups answers by step in plain words, health answers included', () => {
    const g = answerRows({ goal: 'fat_loss', weightKg: 72, conditions: ['thyroid', 'kidney_disease'], pregnant: false, newThing: 3 });
    expect(g).toEqual([
      { section: 'About them', rows: [{ label: 'Weight at assessment', value: '72 kg' }] },
      { section: 'Goal', rows: [{ label: 'Goal', value: 'Lose fat' }] },
      {
        section: 'Health check',
        rows: [
          { label: 'Pregnant', value: 'No' },
          { label: 'Health conditions', value: 'Thyroid condition, Kidney disease' },
        ],
      },
      { section: 'Other', rows: [{ label: 'newThing', value: '3' }] },
    ]);
  });

  it('writes sets, scales and volume simply', () => {
    expect(setLabel({ weightKg: 40, reps: 10 })).toBe('40 kg × 10');
    expect(setLabel({ weightKg: null, reps: 12 })).toBe('Bodyweight × 12');
    expect(scaleLabel(HUNGER, 2)).toBe('A little (2/5)');
    expect(scaleLabel(HUNGER, null)).toBe('–');
    const w = { performed_on: '', day_name: '', duration_min: null, effort: null, notes: null, completed_at: '' };
    expect(workoutVolumeKg({ ...w, exercises: [{ exerciseId: 'a', name: 'A', sets: [{ weightKg: 40, reps: 10 }, { weightKg: null, reps: 5 }] }] })).toBe(400);
  });
});
