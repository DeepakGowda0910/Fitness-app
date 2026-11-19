import { describe, expect, it } from 'vitest';
import { isActivePath } from '../lib/nav';

describe('active navigation tab', () => {
  it('matches the exact page, with or without a trailing slash', () => {
    expect(isActivePath('/plan', '/plan')).toBe(true);
    expect(isActivePath('/plan/', '/plan')).toBe(true);
  });
  it('matches pages inside a section', () => {
    expect(isActivePath('/workouts/log', '/workouts')).toBe(true);
  });
  it('does not match other sections or look-alike names', () => {
    expect(isActivePath('/results', '/plan')).toBe(false);
    expect(isActivePath('/planner', '/plan')).toBe(false);
    expect(isActivePath('/', '/plan')).toBe(false);
  });
  it('only matches home on the home page', () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/plan', '/')).toBe(false);
  });
  it('handles a missing path', () => {
    expect(isActivePath(null, '/plan')).toBe(false);
  });
});
