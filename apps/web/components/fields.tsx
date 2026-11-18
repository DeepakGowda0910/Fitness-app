'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';

export function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm font-medium text-danger-text" role="alert">
      {message}
    </p>
  );
}

export function Fieldset({
  legend,
  hint,
  error,
  children,
}: {
  legend: string;
  hint?: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  const errId = useId();
  return (
    <fieldset className="min-w-0" aria-describedby={error ? errId : undefined}>
      <legend className="mb-1 text-base font-semibold">{legend}</legend>
      {hint ? <p className="mb-3 text-sm text-muted">{hint}</p> : <div className="mb-3" />}
      {children}
      <FieldError id={errId} message={error} />
    </fieldset>
  );
}

/** Large tappable options; one choice. */
export function ChoiceGroup<T extends string | number>({
  name,
  value,
  options,
  onChange,
  columns = 1,
}: {
  name: string;
  value: T | undefined;
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3 | 4;
}) {
  const cols = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[columns];
  return (
    <div className={`grid gap-2 ${cols}`} role="radiogroup">
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <label
            key={String(o.value)}
            className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
              checked ? 'border-brand bg-brand-soft' : 'border-border bg-surface hover:border-muted'
            }`}
          >
            <input
              type="radio"
              name={name}
              className="mt-1 size-4 shrink-0 accent-[var(--brand)]"
              checked={checked}
              onChange={() => onChange(o.value)}
            />
            <span className="min-w-0">
              <span className="block font-medium">{o.label}</span>
              {o.hint ? <span className="block text-sm text-muted">{o.hint}</span> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Several choices allowed. */
export function CheckGroup<T extends string>({
  value,
  options,
  onChange,
  columns = 1,
}: {
  value: readonly T[];
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T[]) => void;
  columns?: 1 | 2 | 3;
}) {
  const cols = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3' }[columns];
  return (
    <div className={`grid gap-2 ${cols}`}>
      {options.map((o) => {
        const checked = value.includes(o.value);
        return (
          <label
            key={o.value}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
              checked ? 'border-brand bg-brand-soft' : 'border-border bg-surface hover:border-muted'
            }`}
          >
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-[var(--brand)]"
              checked={checked}
              onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))}
            />
            <span className="font-medium">{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

/** A yes/no question as a single checkbox row. */
export function YesNo({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
        value ? 'border-brand bg-brand-soft' : 'border-border bg-surface hover:border-muted'
      }`}
    >
      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[var(--brand)]" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block font-medium">{label}</span>
        {hint ? <span className="block text-sm text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * Number input that lets the user type freely (e.g. "7" on the way to "72.5")
 * and reports a number, or undefined when empty or not a number.
 */
export function NumberField({
  label,
  unit,
  value,
  onChange,
  error,
  hint,
  step = 'any',
  inputMode = 'decimal',
  placeholder,
}: {
  label: string;
  unit?: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  error?: string | undefined;
  hint?: string;
  step?: string;
  inputMode?: 'decimal' | 'numeric';
  placeholder?: string;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const [text, setText] = useState(value === undefined ? '' : String(value));

  // Follow outside changes (e.g. a saved draft loading) without fighting the user's typing.
  useEffect(() => {
    const parsed = text.trim() === '' ? undefined : Number(text);
    if (parsed !== value) setText(value === undefined ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-base font-semibold">
        {label}
      </label>
      {hint ? <p className="mb-2 text-sm text-muted">{hint}</p> : null}
      <div
        className={`flex h-12 items-center rounded-xl border bg-surface pr-4 focus-within:border-brand ${
          error ? 'border-danger-border' : 'border-border'
        }`}
      >
        <input
          id={id}
          type="number"
          inputMode={inputMode}
          step={step}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
          className="h-full w-full min-w-0 rounded-xl bg-transparent px-4 text-lg outline-none"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const t = e.target.value.trim();
            const n = Number(t);
            onChange(t === '' || !Number.isFinite(n) ? undefined : n);
          }}
        />
        {unit ? <span className="shrink-0 text-muted">{unit}</span> : null}
      </div>
      <FieldError id={errId} message={error} />
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger'; children: ReactNode }) {
  const styles = {
    info: 'border-border bg-surface-2 text-text',
    warn: 'border-warn-border bg-warn-bg text-warn-text',
    danger: 'border-danger-border bg-danger-bg text-danger-text',
  }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}
