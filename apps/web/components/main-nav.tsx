'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { isActivePath } from '@/lib/nav';

const TABS: { href: string; short: string; long: string }[] = [
  { href: '/assessment', short: 'Start', long: 'Assessment' },
  { href: '/results', short: 'Targets', long: 'Targets' },
  { href: '/plan', short: 'Plan', long: 'Diet plan' },
  { href: '/workouts', short: 'Train', long: 'Workouts' },
  { href: '/checkin', short: 'Check-in', long: 'Check-in' },
];

/** The header tabs. The tab for the page you are on is highlighted and marked as the current page. */
export function MainNav({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center gap-0 text-sm font-semibold sm:gap-1">
      {TABS.map((tab) => {
        const active = isActivePath(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            data-active={active || undefined}
            className="nav-tab relative whitespace-nowrap rounded-lg px-1.5 py-2 sm:px-3"
          >
            {tab.short === tab.long ? (
              tab.long
            ) : (
              <>
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.long}</span>
              </>
            )}
          </Link>
        );
      })}
      {children}
    </nav>
  );
}
