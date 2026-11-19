import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXERCISES } from '@fitness/workout-planner';
import { describe, expect, it } from 'vitest';
import { CLIP_NOTES, clipFor } from '../lib/exercise-clips';

const pub = fileURLToPath(new URL('../public', import.meta.url));

describe('exercise demonstration clips', () => {
  it('has a small looping clip and a poster for every exercise in the library', () => {
    for (const e of EXERCISES) {
      for (const f of [`demos/${e.id}.mp4`, `demos/${e.id}.webm`, `demos/${e.id}.jpg`]) {
        const p = join(pub, f);
        expect(existsSync(p), f).toBe(true);
        // Keep clips light for phones on mobile data.
        expect(statSync(p).size, f).toBeLessThan(250_000);
      }
    }
  });

  it('builds clip paths from the exercise id', () => {
    expect(clipFor('push_up')).toEqual({ video: '/demos/push_up.mp4', webm: '/demos/push_up.webm', poster: '/demos/push_up.jpg' });
  });

  it('only has notes for real exercises', () => {
    const ids = new Set(EXERCISES.map((e) => e.id));
    for (const id of Object.keys(CLIP_NOTES)) expect(ids.has(id), id).toBe(true);
  });
});
