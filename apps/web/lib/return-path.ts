/**
 * The page someone was trying to open before they had to sign in. Kept in
 * localStorage, not sessionStorage, because an emailed link often opens in a
 * new tab.
 */
const KEY = 'ha-return-path';
/** Older than this, the sign-in is a separate visit and goes to the usual "You're signed in" page. */
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

/** Only the app's own pages, never another site. */
const SAFE_PATH = /^\/(assessment|results|plan|workouts|checkin)\/?$/;

/** `path` is without the base path, as Next.js's usePathname gives it. */
export function rememberReturnPath(path: string): void {
  if (!SAFE_PATH.test(path)) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // No storage (private mode): they land on "You're signed in" instead.
  }
}

/** Reads and forgets the remembered page, or null if there is none or it is stale. */
export function takeReturnPath(now = Date.now()): string | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    window.localStorage.removeItem(KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path?: unknown; at?: unknown };
    if (typeof path !== 'string' || typeof at !== 'number' || !SAFE_PATH.test(path) || now - at > MAX_AGE_MS) return null;
    return path;
  } catch {
    return null;
  }
}
