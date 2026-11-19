import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccountButton, SyncNotice } from '@/components/account';
import { MainNav } from '@/components/main-nav';
import { AppDataProvider } from '@/lib/app-data';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Hyper Active', template: '%s · Hyper Active' },
  description: 'Calorie and macro targets, Indian diet plans, workout plans and weekly check-ins that adapt to you.',
  applicationName: 'Hyper Active',
  appleWebApp: { capable: true, title: 'Hyper Active', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6faff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh antialiased">
        <AppDataProvider>
        <header className="sticky top-0 z-20 bg-[var(--header-bg)] shadow-[0_2px_14px_rgb(0_0_0/0.06)] backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 lg:px-8">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand shadow-[0_4px_12px_var(--glow)] text-xs font-extrabold tracking-tight text-on-brand">
                HA
              </span>
              <span className="hidden sm:inline">Hyper Active</span>
            </Link>
            <MainNav>
              <AccountButton />
            </MainNav>
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
