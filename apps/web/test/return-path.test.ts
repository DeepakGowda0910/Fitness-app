import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rememberReturnPath, takeReturnPath } from '../lib/return-path';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('return path after sign-in', () => {
  it('sends people back to the page they tried to open, once', () => {
    rememberReturnPath('/plan');
    expect(takeReturnPath()).toBe('/plan');
    expect(takeReturnPath()).toBeNull();
  });

  it('only remembers the app’s own pages', () => {
    rememberReturnPath('//evil.example/plan');
    expect(takeReturnPath()).toBeNull();
    store.set('ha-return-path', JSON.stringify({ path: 'https://evil.example', at: Date.now() }));
    expect(takeReturnPath()).toBeNull();
  });

  it('forgets it after two hours', () => {
    rememberReturnPath('/workouts/');
    expect(takeReturnPath(Date.now() + 3 * 60 * 60 * 1000)).toBeNull();
  });
});
