/** True when `pathname` is the page `href` points to, or a page inside it (e.g. /plan/day-2 for /plan). */
export function isActivePath(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
  const path = clean(pathname);
  const target = clean(href);
  if (target === '/') return path === '/';
  return path === target || path.startsWith(`${target}/`);
}
