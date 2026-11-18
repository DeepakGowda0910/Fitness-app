import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AccountBar } from '@/components/account-bar';
import { SessionProvider } from '@/lib/session';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Hyper Active Admin', template: '%s · Hyper Active Admin' },
  description: 'Admin dashboard for Hyper Active.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1419' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh antialiased">
        <SessionProvider>
          <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 lg:px-8">
              <div className="flex items-center gap-2 font-semibold tracking-tight">
                <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand text-xs font-extrabold tracking-tight text-on-brand">
                  HA
                </span>
                <span>
                  Hyper Active <span className="font-medium text-muted">Admin</span>
                </span>
              </div>
              <AccountBar />
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 lg:px-8 lg:pt-10">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
