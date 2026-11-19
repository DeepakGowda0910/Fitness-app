'use client';

import { useEffect, useRef, useState } from 'react';
import { exerciseById } from '@fitness/workout-planner';
import { CLIP_NOTES, clipFor } from '@/lib/exercise-clips';

const RED = '#c8261c';

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * A looping 3D demonstration clip of one exercise. Nothing is downloaded until
 * the clip scrolls near the screen, it only plays while visible, and it starts
 * paused for people who ask their device for less motion.
 */
export function ExerciseDemo({ exerciseId, name, compact = false }: { exerciseId: string; name: string; compact?: boolean }) {
  const exercise = exerciseById(exerciseId);
  const clip = clipFor(exerciseId);
  const boxRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) setPlaying(false);
  }, []);

  // Load once the clip comes near the screen; play only while it is on screen.
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      setVisible(true);
      return;
    }
    const nearIo = new IntersectionObserver(([e]) => e?.isIntersecting && setNear(true), { rootMargin: '400px' });
    const seenIo = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting));
    nearIo.observe(el);
    seenIo.observe(el);
    return () => {
      nearIo.disconnect();
      seenIo.disconnect();
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !near) return;
    if (v.networkState === v.NETWORK_EMPTY) v.load();
    if (visible && playing) v.play().catch(() => setPlaying(false));
    else v.pause();
  }, [near, visible, playing]);

  if (!exercise) return null;
  const note = CLIP_NOTES[exerciseId];

  return (
    <figure ref={boxRef} className={`overflow-hidden rounded-xl border border-border bg-surface ${compact ? 'max-w-72' : ''}`}>
      <div className="relative aspect-[6/5]" style={{ background: 'linear-gradient(180deg, #eef1f5 0%, #e9edf2 60%, #e2e5e9 100%)' }}>
        {failed ? (
          <p className="grid h-full place-items-center p-4 text-center text-xs text-muted">The demonstration could not load. Check your connection.</p>
        ) : (
          <video
            ref={videoRef}
            className="block h-full w-full object-contain"
            poster={clip.poster}
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            aria-label={`Animated demonstration of ${name}`}
          >
            {near ? (
              <>
                <source src={clip.video} type="video/mp4" />
                {/* Only reached when the MP4 cannot play; an error here means neither format works. */}
                <source src={clip.webm} type="video/webm" onError={() => setFailed(true)} />
              </>
            ) : null}
          </video>
        )}
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
      <figcaption className="border-t border-border px-3 py-2 text-xs leading-snug text-muted">
        {note ? `${note} · ` : ''}
        <span className="whitespace-nowrap">
          <span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: RED }} aria-hidden />
          red = muscles worked
        </span>
      </figcaption>
    </figure>
  );
}
