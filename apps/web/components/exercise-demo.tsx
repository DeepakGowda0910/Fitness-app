'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { demoViewBox, drawFrame, type Paint, type Shape } from '@/lib/demo-draw';
import { cycleMs, sample, solve } from '@/lib/demo-rig';
import { demoFor } from '@/lib/exercise-demos';

/** Theme-aware colours, so the drawing follows light and dark mode. */
const PAINT: Record<Paint, string> = {
  body: 'var(--brand)',
  bodyFar: 'color-mix(in srgb, var(--brand) 45%, var(--surface))',
  skin: '#f1b98f',
  kit: 'color-mix(in srgb, var(--text) 75%, var(--surface))',
  kitSoft: 'color-mix(in srgb, var(--muted) 35%, var(--surface))',
  floor: 'var(--border)',
  face: '#16202a',
};

const FRAME_MS = 1000 / 30;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * An animated demonstration of one exercise. It only animates while it is on
 * screen, and starts paused for people who ask their device for less motion.
 */
export function ExerciseDemo({ exerciseId, name, compact = false }: { exerciseId: string; name: string; compact?: boolean }) {
  const demo = demoFor(exerciseId);
  const boxRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [ms, setMs] = useState(0);

  // Respect the "reduce motion" setting: start paused on the start position.
  useEffect(() => {
    if (prefersReducedMotion()) setPlaying(false);
  }, []);

  // Animate only while on screen.
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!demo || !visible || !playing) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      acc += dt;
      if (acc >= FRAME_MS) {
        const step = acc;
        acc = 0;
        setMs((m) => (m + step) % cycleMs(demo));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [demo, visible, playing]);

  // Frame the whole movement once, so every figure fills its box.
  const viewBox = useMemo(() => {
    if (!demo) return '0 0 240 200';
    const at = (t: number) => {
      const s = sample(demo, t);
      return { f: solve(s.pose, demo), o: s.opacity };
    };
    return demoViewBox(demo, at, cycleMs(demo))
      .map((n) => Math.round(n * 10) / 10)
      .join(' ');
  }, [demo]);

  const view = useMemo(() => {
    if (!demo) return null;
    const s = sample(demo, ms);
    return { shapes: drawFrame(demo, solve(s.pose, demo), s.opacity), key: s.key };
  }, [demo, ms]);

  if (!demo || !view) return null;
  const label = demo.keys[view.key]?.label ?? '';
  const steps = new Set(demo.keys.map((k) => k.label)).size;

  return (
    <figure ref={boxRef} className={`overflow-hidden rounded-xl border border-border bg-surface-2/60 ${compact ? 'max-w-72' : ''}`}>
      <div className="relative">
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMax meet"
          className="block h-auto w-full"
          role="img"
          aria-label={`Animated demonstration of ${name}`}
        >
          {view.shapes.map((s, i) => (
            <ShapeEl key={i} s={s} />
          ))}
        </svg>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="absolute right-2 top-2 grid size-9 place-items-center rounded-full border border-border bg-surface/90 text-sm text-muted hover:text-text"
          aria-label={playing ? `Pause the ${name} demonstration` : `Play the ${name} demonstration`}
        >
          {playing ? (
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
      <figcaption className="border-t border-border px-3 py-2 text-xs leading-snug">
        <span className="font-medium text-text">{label}</span>
        <span className="mt-0.5 block text-muted">
          {demo.note ? `${demo.note} · ` : ''}
          {steps > 1 ? `${steps}-step animated guide` : 'Animated guide'}
        </span>
      </figcaption>
    </figure>
  );
}

function ShapeEl({ s }: { s: Shape }) {
  const opacity = s.o === undefined || s.o === 1 ? undefined : s.o;
  switch (s.t) {
    case 'line':
      return <line x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={PAINT[s.c]} strokeWidth={s.w} strokeLinecap="round" opacity={opacity} />;
    case 'path':
      return (
        <path
          d={s.d}
          fill={s.fill ? PAINT[s.fill] : 'none'}
          stroke={PAINT[s.c]}
          strokeWidth={s.w}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={opacity}
        />
      );
    case 'circle':
      return <circle cx={s.c0[0]} cy={s.c0[1]} r={s.r} fill={PAINT[s.fill]} opacity={opacity} />;
    case 'ring':
      return <circle cx={s.c0[0]} cy={s.c0[1]} r={s.r} fill="none" stroke={PAINT[s.c]} strokeWidth={s.w} opacity={opacity} />;
    case 'rect':
      return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={PAINT[s.fill]} opacity={opacity} />;
  }
}
