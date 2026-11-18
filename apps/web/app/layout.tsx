import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccountButton, SyncNotice } from '@/components/account';
import { AppDataProvider } from '@/lib/app-data';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Fitness', template: '%s · Fitness' },
  description: 'Calorie and macro targets, Indian diet plans and weekly check-ins that adapt to you.',
  applicationName: 'Fitness',
  appleWebApp: { capable: true, title: 'Fitness', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1412' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh antialiased">
        <AppDataProvider>
        <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 lg:px-8">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-brand text-sm text-on-brand">
                F
              </span>
              <span className="hidden sm:inline">Fitness</span>
            </Link>
            <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
              <Link href="/assessment" className="rounded-lg px-2 py-2 text-muted hover:bg-surface-2 hover:text-text sm:px-3">
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Assessment</span>
              </Link>
              <Link href="/results" className="rounded-lg px-2 py-2 text-muted hover:bg-surface-2 hover:text-text sm:px-3">
                Targets
              </Link>
              <Link href="/plan" className="rounded-lg px-2 py-2 text-muted hover:bg-surface-2 hover:text-text sm:px-3">
                <span className="sm:hidden">Plan</span>
                <span className="hidden sm:inline">Diet plan</span>
              </Link>
              <Link href="/checkin" className="rounded-lg px-2 py-2 text-muted hover:bg-surface-2 hover:text-text sm:px-3">
                Check-in
              </Link>
              <AccountButton />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 lg:px-8 lg:pb-16 lg:pt-10">
          <SyncNotice />
          {children}
        </main>
        </AppDataProvider>
      </body>
    </html>
  );
}
