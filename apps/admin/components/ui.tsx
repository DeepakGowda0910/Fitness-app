import type { ReactNode } from 'react';

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'danger'; children: ReactNode }) {
  const styles = tone === 'danger' ? 'border-danger-border bg-danger-bg text-danger-text' : 'border-border bg-surface-2 text-text';
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-2">{children}</div>
    </section>
  );
}
