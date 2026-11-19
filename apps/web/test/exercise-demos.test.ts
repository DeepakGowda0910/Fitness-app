import { EXERCISES, generateProgram, splitStylesFor, type Experience, type Goal } from '@fitness/workout-planner';
import { describe, expect, it } from 'vitest';
import { drawFrame } from '../lib/demo-draw';
import { BODY, cycleMs, sample, solve, solveLimb, type Pt } from '../lib/demo-rig';
import { DEMOS, demoFor } from '../lib/exercise-demos';

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('exercise demos', () => {
  it('has a demo for every exercise in the library, and none for unknown ones', () => {
    const ids = EXERCISES.map((e) => e.id).sort();
    expect(Object.keys(DEMOS).sort()).toEqual(ids);
  });

  it('covers every exercise any plan can recommend', () => {
    const missing = new Set<string>();
    for (const equipment of ['gym', 'dumbbells', 'bodyweight'] as const)
      for (const experience of ['beginner', 'intermediate', 'advanced'] as Experience[])
        for (const goal of ['fat_loss', 'strength', 'endurance', 'lean_gain'] as Goal[])
          for (let daysPerWeek = 1; daysPerWeek <= 6; daysPerWeek++)
            for (const split of splitStylesFor(daysPerWeek))
              for (const sessionMinutes of [30, 45, 60, 90]) {
                const program = generateProgram({ daysPerWeek, sessionMinutes, experience, goal, equipment, split });
                for (const d of program.days) for (const p of d.exercises) if (!demoFor(p.exerciseId)) missing.add(p.exerciseId);
              }
    expect([...missing]).toEqual([]);
  });

  for (const [id, demo] of Object.entries(DEMOS)) {
    it(`${id}: hands and feet reach their targets, limbs keep their length, and it stays in view`, () => {
      expect(demo.keys.length).toBeGreaterThanOrEqual(2);
      expect(cycleMs(demo)).toBeGreaterThan(1000);
      expect(cycleMs(demo)).toBeLessThan(20000);
      for (const k of demo.keys) expect(k.label.length).toBeGreaterThan(3);
      for (let ms = 0; ms < cycleMs(demo); ms += 25) {
        const f = solve(sample(demo, ms).pose, demo);
        expect(f.miss).toBeLessThan(3.5);
        expect(dist(f.shoulderN, f.elbowN)).toBeCloseTo(BODY.upperArm, 3);
        expect(dist(f.hipF, f.kneeF)).toBeCloseTo(BODY.thigh, 3);
        for (const p of [f.head, f.wristN, f.wristF, f.toeN, f.toeF, f.kneeN, f.elbowF]) {
          expect(p[0]).toBeGreaterThan(-2);
          expect(p[0]).toBeLessThan(242);
          expect(p[1]).toBeGreaterThan(-2);
          expect(p[1]).toBeLessThan(202);
        }
        for (const s of drawFrame(demo, f)) if (s.t === 'line') expect(Number.isFinite(s.a[0] + s.b[1])).toBe(true);
      }
    });
  }
});

describe('solveLimb', () => {
  it('bends the middle joint towards the preferred side', () => {
    const up = solveLimb([0, 0], [40, 0], 25, 23, [0, -1]);
    const down = solveLimb([0, 0], [40, 0], 25, 23, [0, 1]);
    expect(up.mid[1]).toBeLessThan(0);
    expect(down.mid[1]).toBeGreaterThan(0);
    expect(up.miss).toBeCloseTo(0, 6);
  });

  it('reaches as far as it can towards a target out of reach', () => {
    const r = solveLimb([0, 0], [100, 0], 25, 23, [0, 1]);
    expect(r.end[0]).toBeCloseTo(48, 3);
    expect(r.miss).toBeCloseTo(52, 3);
  });
});

describe('workedParts', () => {
  it('maps each exercise muscle list to body parts shown in red', async () => {
    const { workedParts } = await import('../lib/demo-draw');
    expect([...workedParts('Quads, glutes')].sort()).toEqual(['glute', 'thigh']);
    expect([...workedParts('Chest, shoulders, triceps')].sort()).toEqual(['delt', 'pec', 'upperArm']);
    expect([...workedParts('Heart and lungs')]).toEqual([]);
    for (const e of EXERCISES) if (e.pattern !== 'conditioning') expect(workedParts(e.muscles).size).toBeGreaterThan(0);
  });
});
