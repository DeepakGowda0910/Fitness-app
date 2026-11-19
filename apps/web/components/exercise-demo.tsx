'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { exerciseById } from '@fitness/workout-planner';
import { COLORS as PAINT, demoViewBox, drawFrame, workedParts, type Shape } from '@/lib/demo-draw';
import { cycleMs, sample, solve } from '@/lib/demo-rig';
import { demoFor } from '@/lib/exercise-demos';

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
  const worked = useMemo(() => workedParts(exerciseById(exerciseId)?.muscles ?? ''), [exerciseId]);
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
    return { shapes: drawFrame(demo, solve(s.pose, demo), s.opacity, worked), key: s.key };
  }, [demo, ms, worked]);

  if (!demo || !view) return null;
  const label = demo.keys[view.key]?.label ?? '';
  const steps = new Set(demo.keys.map((k) => k.label)).size;

  return (
    <figure ref={boxRef} className={`overflow-hidden rounded-xl border border-border bg-surface ${compact ? 'max-w-72' : ''}`}>
      {/* A light "studio" backdrop in both themes, so the shaded figure reads clearly. */}
      <div className="relative" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 70%, #e8eef4 100%)' }}>
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
          {worked.size > 0 ? (
            <>
              {' · '}
              <span className="whitespace-nowrap">
                <span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: PAINT.m1 }} aria-hidden />
                red = muscles worked
              </span>
            </>
          ) : null}
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
    case 'ellipse':
      return <ellipse cx={s.c0[0]} cy={s.c0[1]} rx={s.rx} ry={s.ry} fill={PAINT[s.fill]} opacity={opacity} />;
    case 'rect':
      return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} fill={PAINT[s.fill]} opacity={opacity} />;
  }
}
