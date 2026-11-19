/**
 * Turns a solved frame into a list of simple SVG shapes. Kept free of React so
 * tests (and the preview script) can draw demos too.
 */
import { BODY, dir, FLOOR, jointAt, VIEW_H, VIEW_W, type Demo, type Frame, type Prop, type Pt } from './demo-rig';

export type Shape =
  | { t: 'line'; a: Pt; b: Pt; w: number; c: Paint; o?: number }
  | { t: 'path'; d: string; w: number; c: Paint; o?: number; fill?: Paint }
  | { t: 'circle'; c0: Pt; r: number; fill: Paint; o?: number }
  | { t: 'ring'; c0: Pt; r: number; w: number; c: Paint; o?: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; r: number; fill: Paint; o?: number };

/** Colour roles, mapped to the app's theme colours by the renderer. */
export type Paint = 'body' | 'bodyFar' | 'skin' | 'kit' | 'kitSoft' | 'floor' | 'face';

const r1 = (n: number) => Math.round(n * 10) / 10;
const P = (p: Pt) => `${r1(p[0])} ${r1(p[1])}`;
const poly = (...pts: Pt[]) => `M${pts.map(P).join(' L')}`;

function propShapes(p: Prop, f: Frame): Shape[] {
  switch (p.kind) {
    case 'plate': {
      const c = jointAt(f, p.at);
      const r = p.r ?? 15;
      return [
        { t: 'circle', c0: c, r, fill: 'kit' },
        { t: 'circle', c0: c, r: r * 0.55, fill: 'kitSoft' },
        { t: 'circle', c0: c, r: 2.2, fill: 'kit' },
      ];
    }
    case 'dumbbell': {
      const c = jointAt(f, p.at);
      return [
        { t: 'rect', x: c[0] - 8, y: c[1] - 2, w: 16, h: 4, r: 2, fill: 'kit' },
        { t: 'rect', x: c[0] - 10, y: c[1] - 5.5, w: 5, h: 11, r: 1.5, fill: 'kit' },
        { t: 'rect', x: c[0] + 5, y: c[1] - 5.5, w: 5, h: 11, r: 1.5, fill: 'kit' },
      ];
    }
    case 'kettle': {
      // A dumbbell held upright at the chest (goblet hold).
      const c = jointAt(f, p.at);
      return [
        { t: 'rect', x: c[0] - 2, y: c[1] - 9, w: 4, h: 18, r: 2, fill: 'kit' },
        { t: 'rect', x: c[0] - 6, y: c[1] - 12, w: 12, h: 6, r: 2, fill: 'kit' },
        { t: 'rect', x: c[0] - 6, y: c[1] + 6, w: 12, h: 6, r: 2, fill: 'kit' },
      ];
    }
    case 'bag': {
      const c = jointAt(f, p.at);
      return [
        { t: 'rect', x: c[0] - 9, y: c[1], w: 18, h: 20, r: 5, fill: 'kit' },
        { t: 'rect', x: c[0] - 5, y: c[1] + 8, w: 10, h: 7, r: 2, fill: 'kitSoft' },
      ];
    }
    case 'handle': {
      const c = jointAt(f, p.at);
      return [{ t: 'rect', x: c[0] - 3, y: c[1] - 7, w: 6, h: 14, r: 3, fill: 'kit' }];
    }
    case 'cable': {
      const c = jointAt(f, p.at);
      return [
        { t: 'line', a: p.from, b: c, w: 1.5, c: 'kit' },
        { t: 'circle', c0: p.from, r: 4, fill: 'kit' },
        { t: 'rect', x: c[0] - 3, y: c[1] - 3, w: 6, h: 6, r: 2, fill: 'kit' },
      ];
    }
    case 'lever': {
      const c = jointAt(f, p.at);
      return [
        { t: 'line', a: p.from, b: c, w: 5, c: 'kitSoft' },
        { t: 'circle', c0: p.from, r: 4, fill: 'kit' },
        { t: 'rect', x: c[0] - 3, y: c[1] - 7, w: 6, h: 14, r: 3, fill: 'kit' },
      ];
    }
    case 'pad': {
      const c = jointAt(f, p.at);
      return [{ t: 'rect', x: c[0] - 9, y: c[1] - 9, w: 18, h: 7, r: 3, fill: 'kit' }];
    }
    case 'sled': {
      // A flat plate the feet push (leg press), at a fixed angle.
      const c = jointAt(f, p.at);
      const u = dir(p.angle);
      return [{ t: 'line', a: [c[0] - u[0] * 16, c[1] - u[1] * 16], b: [c[0] + u[0] * 16, c[1] + u[1] * 16], w: 6, c: 'kit' }];
    }
    case 'rect':
      return [{ t: 'rect', x: p.x, y: p.y, w: p.w, h: p.h, r: p.r ?? 3, fill: 'kitSoft' }];
    case 'line':
      return [{ t: 'line', a: p.a, b: p.b, w: p.w ?? 4, c: 'kitSoft' }];
    case 'ring':
      return [{ t: 'ring', c0: p.c, r: p.r, w: 3, c: 'kitSoft' }];
  }
}

/** All shapes for one frame, back to front. */
export function drawFrame(demo: Demo, f: Frame, opacity = 1): Shape[] {
  const o = opacity;
  const out: Shape[] = demo.noFloor ? [] : [{ t: 'line', a: [8, FLOOR + 1.5], b: [VIEW_W - 8, FLOOR + 1.5], w: 3, c: 'floor' }];
  for (const p of demo.back ?? []) out.push(...propShapes(p, f));

  const limb = (a: Pt, b: Pt, c: Pt, w: number, paint: Paint): Shape => ({ t: 'path', d: poly(a, b, c), w, c: paint, o });
  const far: Paint = f.front ? 'body' : 'bodyFar';
  // Far side first, so the near limbs overlap it.
  out.push(limb(f.shoulderF, f.elbowF, f.wristF, 7, far));
  out.push(limb(f.hipF, f.kneeF, f.ankleF, 9, far));
  out.push({ t: 'line', a: f.ankleF, b: f.toeF, w: 6, c: far, o });

  if (f.front) {
    // A tapered torso, shoulders wider than hips.
    const s = f.side;
    const pts: Pt[] = [
      [f.shoulder[0] + s[0] * 13, f.shoulder[1] + s[1] * 13],
      [f.shoulder[0] - s[0] * 13, f.shoulder[1] - s[1] * 13],
      [f.hip[0] - s[0] * 9, f.hip[1] - s[1] * 9],
      [f.hip[0] + s[0] * 9, f.hip[1] + s[1] * 9],
    ];
    out.push({ t: 'path', d: `${poly(...pts)} Z`, w: 6, c: 'body', o, fill: 'body' });
  } else {
    // Torso: a thick line from hips to shoulders.
    out.push({ t: 'line', a: f.hip, b: f.shoulder, w: 15, c: 'body', o });
  }
  out.push({ t: 'line', a: f.shoulder, b: f.neck, w: 6, c: 'skin', o });
  out.push({ t: 'circle', c0: f.head, r: BODY.head, fill: 'skin', o });
  if (f.front) {
    // Two eyes facing you (or the back of the head, from above).
    if (!demo.noFloor) {
      for (const k of [-3.2, 3.2]) out.push({ t: 'circle', c0: [f.head[0] + f.side[0] * k, f.head[1] + f.side[1] * k], r: 1.6, fill: 'face', o });
    }
  } else {
    // A small visor on the face side, so you can tell face-up from face-down.
    const eye: Pt = [f.head[0] + f.face[0] * 5.5, f.head[1] + f.face[1] * 5.5];
    out.push({ t: 'circle', c0: eye, r: 2.4, fill: 'face', o });
  }

  out.push(limb(f.hipN, f.kneeN, f.ankleN, 9.5, 'body'));
  out.push({ t: 'line', a: f.ankleN, b: f.toeN, w: 6, c: 'body', o });
  out.push(limb(f.shoulderN, f.elbowN, f.wristN, 7.5, 'body'));
  out.push({ t: 'circle', c0: f.wristN, r: 3.6, fill: 'skin', o });
  if (f.front) out.push({ t: 'circle', c0: f.wristF, r: 3.6, fill: 'skin', o });

  for (const p of demo.front ?? []) out.push(...propShapes(p, f).map((s) => ({ ...s, o })));
  return out;
}

/** Plain SVG markup for a frame, with fixed colours (tests and previews). */
export function frameSvg(demo: Demo, f: Frame, size = 240): string {
  const color: Record<Paint, string> = {
    body: '#0284c7',
    bodyFar: '#7cc4ea',
    skin: '#f1b98f',
    kit: '#3b4656',
    kitSoft: '#c9d3df',
    floor: '#dbe4ee',
    face: '#16202a',
  };
  const parts = drawFrame(demo, f).map((s) => {
    const op = s.o === undefined ? '' : ` opacity="${s.o}"`;
    switch (s.t) {
      case 'line':
        return `<line x1="${r1(s.a[0])}" y1="${r1(s.a[1])}" x2="${r1(s.b[0])}" y2="${r1(s.b[1])}" stroke="${color[s.c]}" stroke-width="${s.w}" stroke-linecap="round"${op}/>`;
      case 'path':
        return `<path d="${s.d}" fill="${s.fill ? color[s.fill] : 'none'}" stroke="${color[s.c]}" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round"${op}/>`;
      case 'circle':
        return `<circle cx="${r1(s.c0[0])}" cy="${r1(s.c0[1])}" r="${s.r}" fill="${color[s.fill]}"${op}/>`;
      case 'ring':
        return `<circle cx="${r1(s.c0[0])}" cy="${r1(s.c0[1])}" r="${s.r}" fill="none" stroke="${color[s.c]}" stroke-width="${s.w}"${op}/>`;
      case 'rect':
        return `<rect x="${r1(s.x)}" y="${r1(s.y)}" width="${s.w}" height="${s.h}" rx="${s.r}" fill="${color[s.fill]}"${op}/>`;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" width="${size}" height="${(size * 200) / 240}">${parts.join('')}</svg>`;
}

/**
 * The part of the 240 × 200 box the whole animation uses, padded and kept at
 * the same 6:5 shape, so small figures are shown larger.
 */
export function demoViewBox(demo: Demo, solveAt: (ms: number) => { f: Frame; o: number }, totalMs: number): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const grow = (x: number, y: number, r = 0) => {
    x0 = Math.min(x0, x - r);
    y0 = Math.min(y0, y - r);
    x1 = Math.max(x1, x + r);
    y1 = Math.max(y1, y + r);
  };
  for (let ms = 0; ms < totalMs; ms += 50) {
    const { f, o } = solveAt(ms);
    for (const s of drawFrame(demo, f, o)) {
      // The floor spans the whole width; size the view to the figure and kit.
      if (s.t === 'line' && s.c === 'floor') continue;
      if (s.t === 'line') {
        grow(s.a[0], s.a[1], s.w / 2);
        grow(s.b[0], s.b[1], s.w / 2);
      } else if (s.t === 'circle' || s.t === 'ring') grow(s.c0[0], s.c0[1], s.r);
      else if (s.t === 'rect') {
        grow(s.x, s.y);
        grow(s.x + s.w, s.y + s.h);
      } else for (const m of s.d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)) grow(Number(m[1]), Number(m[2]), s.w / 2);
    }
  }
  const pad = 10;
  let w = x1 - x0 + pad * 2;
  let h = y1 - y0 + pad * 2;
  const ratio = VIEW_W / VIEW_H;
  if (w / h > ratio) h = w / ratio;
  else w = h * ratio;
  // Don't zoom in so far that the figure looks blown up.
  if (w < 170) {
    w = 170;
    h = w / ratio;
  }
  w = Math.min(w, VIEW_W);
  h = Math.min(h, VIEW_H);
  const cx = (x0 + x1) / 2;
  const by = y1 + pad; // keep the floor at the bottom
  const x = Math.max(0, Math.min(VIEW_W - w, cx - w / 2));
  const y = Math.max(0, Math.min(VIEW_H - h, by - h));
  return [x, y, w, h];
}
