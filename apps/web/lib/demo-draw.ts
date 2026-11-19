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
  | { t: 'rect'; x: number; y: number; w: number; h: number; r: number; fill: Paint; o?: number }
  | { t: 'ellipse'; c0: Pt; rx: number; ry: number; fill: Paint; o?: number };

/**
 * Colour roles. The body is drawn in three tones (dark, mid, light) so each
 * limb looks rounded: b = body, m = working muscle, f/g = the same on the far
 * side, a little darker for depth.
 */
export type Paint =
  | 'b0' | 'b1' | 'b2'
  | 'm0' | 'm1' | 'm2'
  | 'f0' | 'f1' | 'f2'
  | 'g0' | 'g1' | 'g2'
  | 'kit' | 'kitHi' | 'kitSoft' | 'kitTop' | 'kitSide'
  | 'floor' | 'shadow' | 'face';

/** Fixed studio colours, the same in light and dark mode. */
export const COLORS: Record<Paint, string> = {
  b0: '#76808c',
  b1: '#a9b2bd',
  b2: '#dfe5ec',
  m0: '#982c20',
  m1: '#d2543e',
  m2: '#f4a28c',
  f0: '#5c6470',
  f1: '#87909b',
  f2: '#b2bac4',
  g0: '#74241a',
  g1: '#a94231',
  g2: '#cf7b69',
  kit: '#343d48',
  kitHi: '#76828f',
  kitSoft: '#c3ccd7',
  kitTop: '#e6ebf1',
  kitSide: '#98a3b1',
  floor: '#d5dee8',
  shadow: '#1b2433',
  face: '#4a525d',
};

/** Body parts that can be shown as working muscles (in red). */
export type Part = 'torso' | 'pec' | 'glute' | 'delt' | 'upperArm' | 'forearm' | 'thigh' | 'shin';

/** Which body parts an exercise's muscle list ("Quads, glutes") works. */
export function workedParts(muscles: string): Set<Part> {
  const m = muscles.toLowerCase();
  const out = new Set<Part>();
  const has = (...words: string[]) => words.some((w) => m.includes(w));
  if (has('quad', 'hamstring', 'hip flexor')) out.add('thigh');
  if (has('glute')) out.add('glute');
  if (has('calves', 'calf')) out.add('shin');
  if (has('chest')) out.add('pec');
  if (has('shoulder')) out.add('delt');
  if (has('triceps', 'biceps')) out.add('upperArm');
  if (has('forearm')) out.add('forearm');
  if (has('lats', 'back', 'abs', 'core', 'oblique')) out.add('torso');
  return out;
}

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
        { t: 'ring', c0: [c[0] - 0.6, c[1] - 0.9], r: r1(r * 0.86), w: 1.4, c: 'kitHi' },
        { t: 'circle', c0: c, r: r1(r * 0.42), fill: 'kitSide' },
        { t: 'circle', c0: c, r: 2.4, fill: 'kitTop' },
      ];
    }
    case 'dumbbell': {
      const c = jointAt(f, p.at);
      return [
        { t: 'rect', x: c[0] - 8, y: c[1] - 1.8, w: 16, h: 3.6, r: 1.8, fill: 'kitSide' },
        { t: 'rect', x: c[0] - 11, y: c[1] - 6, w: 6, h: 12, r: 2, fill: 'kit' },
        { t: 'rect', x: c[0] + 5, y: c[1] - 6, w: 6, h: 12, r: 2, fill: 'kit' },
        { t: 'rect', x: c[0] - 10, y: c[1] - 5, w: 1.8, h: 8, r: 0.9, fill: 'kitHi' },
        { t: 'rect', x: c[0] + 6, y: c[1] - 5, w: 1.8, h: 8, r: 0.9, fill: 'kitHi' },
      ];
    }
    case 'kettle': {
      // A dumbbell held upright at the chest (goblet hold).
      const c = jointAt(f, p.at);
      return [
        { t: 'rect', x: c[0] - 1.8, y: c[1] - 9, w: 3.6, h: 18, r: 1.8, fill: 'kitSide' },
        { t: 'rect', x: c[0] - 6, y: c[1] - 13, w: 12, h: 6, r: 2, fill: 'kit' },
        { t: 'rect', x: c[0] - 6, y: c[1] + 7, w: 12, h: 6, r: 2, fill: 'kit' },
        { t: 'rect', x: c[0] - 5, y: c[1] - 12, w: 8, h: 1.6, r: 0.8, fill: 'kitHi' },
        { t: 'rect', x: c[0] - 5, y: c[1] + 8, w: 8, h: 1.6, r: 0.8, fill: 'kitHi' },
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
      // Lit from above: a pale top edge and a darker underside give depth.
      return [
        { t: 'rect', x: p.x, y: p.y, w: p.w, h: p.h, r: p.r ?? 3, fill: 'kitSide' },
        { t: 'rect', x: p.x, y: p.y, w: p.w, h: Math.max(2, p.h - 2.5), r: p.r ?? 3, fill: 'kitSoft' },
        { t: 'rect', x: p.x + 1, y: p.y, w: Math.max(1, p.w - 2), h: Math.min(2.5, p.h / 3), r: 1.2, fill: 'kitTop' },
      ];
    case 'line':
      return [
        { t: 'line', a: p.a, b: p.b, w: p.w ?? 4, c: 'kitSide' },
        { t: 'line', a: [p.a[0] - 0.6, p.a[1] - 0.6], b: [p.b[0] - 0.6, p.b[1] - 0.6], w: Math.max(1, (p.w ?? 4) * 0.45), c: 'kitSoft' },
      ];
    case 'ring':
      return [{ t: 'ring', c0: p.c, r: p.r, w: 3, c: 'kitSoft' }];
  }
}

/** Direction the light comes from (top left), for the shading. */
const LIGHT: Pt = [-0.45, -0.89];

type Tone = 'b' | 'm' | 'f' | 'g';
const tone = (worked: boolean, far: boolean): Tone => (far ? (worked ? 'g' : 'f') : worked ? 'm' : 'b');

/**
 * A rounded limb from a to b (radius ra at a, rb at b), shaded in three tones
 * so it reads as a cylinder lit from the top left.
 */
function capsule(a: Pt, b: Pt, ra: number, rb: number, t: Tone, o: number): Shape[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  let n: Pt = len > 1e-6 ? [-dy / len, dx / len] : LIGHT;
  if (n[0] * LIGHT[0] + n[1] * LIGHT[1] < 0) n = [-n[0], -n[1]];
  const r = (ra + rb) / 2;
  const layer = (scale: number, shift: number, paint: Paint): Shape[] => {
    const a1: Pt = [a[0] + n[0] * shift, a[1] + n[1] * shift];
    const b1: Pt = [b[0] + n[0] * shift, b[1] + n[1] * shift];
    const sa = ra * scale;
    const sb = rb * scale;
    const quad = `${poly([a1[0] + n[0] * sa, a1[1] + n[1] * sa], [b1[0] + n[0] * sb, b1[1] + n[1] * sb], [b1[0] - n[0] * sb, b1[1] - n[1] * sb], [a1[0] - n[0] * sa, a1[1] - n[1] * sa])} Z`;
    return [
      { t: 'path', d: quad, w: 0, c: paint, fill: paint, o },
      { t: 'circle', c0: a1, r: r1(sa), fill: paint, o },
      { t: 'circle', c0: b1, r: r1(sb), fill: paint, o },
    ];
  };
  return [...layer(1, 0, `${t}0` as Paint), ...layer(0.7, r * 0.27, `${t}1` as Paint), ...layer(0.3, r * 0.55, `${t}2` as Paint)];
}

/** A rounded ball (head, shoulder, chest, glute), shaded the same way. */
function ball(c: Pt, r: number, t: Tone, o: number): Shape[] {
  return [
    { t: 'circle', c0: c, r: r1(r), fill: `${t}0` as Paint, o },
    { t: 'circle', c0: [c[0] + LIGHT[0] * r * 0.18, c[1] + LIGHT[1] * r * 0.18], r: r1(r * 0.78), fill: `${t}1` as Paint, o },
    { t: 'circle', c0: [c[0] + LIGHT[0] * r * 0.42, c[1] + LIGHT[1] * r * 0.42], r: r1(r * 0.36), fill: `${t}2` as Paint, o },
  ];
}

const along = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const plus = (a: Pt, v: Pt, k: number): Pt => [a[0] + v[0] * k, a[1] + v[1] * k];

/** All shapes for one frame, back to front. Worked muscles are shown in red. */
export function drawFrame(demo: Demo, f: Frame, opacity = 1, worked: ReadonlySet<Part> = new Set()): Shape[] {
  const o = opacity;
  const w = (p: Part) => worked.has(p);
  const out: Shape[] = [];
  if (!demo.noFloor) {
    out.push({ t: 'rect', x: 0, y: FLOOR + 0.5, w: VIEW_W, h: 9.5, r: 0, fill: 'floor' });
    // A soft shadow under the body.
    const xs = [f.hip[0], f.shoulder[0], f.ankleN[0], f.ankleF[0]];
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const rx = Math.max(22, (Math.max(...xs) - Math.min(...xs)) / 2 + 14);
    out.push({ t: 'ellipse', c0: [cx, FLOOR + 2.5], rx: r1(rx), ry: 3.6, fill: 'shadow', o: 0.14 * o });
  }
  for (const p of demo.back ?? []) out.push(...propShapes(p, f));

  const arm = (s: Pt, e: Pt, wr: Pt, far: boolean) => [
    ...capsule(s, e, 5.6, 4.3, tone(w('upperArm'), far), o),
    ...capsule(e, wr, 4.3, 3.0, tone(w('forearm'), far), o),
    ...ball(wr, 3.2, far ? 'f' : 'b', o),
  ];
  const leg = (h: Pt, k: Pt, a: Pt, toe: Pt, far: boolean) => [
    ...capsule(h, k, 8.6, 5.6, tone(w('thigh'), far), o),
    ...capsule(k, a, 5.6, 3.4, tone(w('shin'), far), o),
    ...capsule(a, toe, 3.3, 2.2, far ? 'f' : 'b', o),
  ];
  const delt = (s: Pt, far: boolean) => ball(s, 6.6, tone(w('delt'), far), o);

  if (f.front) {
    const side = f.side;
    out.push(...leg(f.hipF, f.kneeF, f.ankleF, f.toeF, false));
    out.push(...leg(f.hipN, f.kneeN, f.ankleN, f.toeN, false));
    out.push(...capsule(f.hip, f.shoulder, 10.5, 13.5, tone(w('torso'), false), o));
    if (!demo.noFloor) {
      for (const k of [-6, 6]) out.push(...ball(plus(along(f.shoulder, f.hip, 0.2), side, k), 6.2, tone(w('pec'), false), o));
    }
    out.push(...capsule(f.shoulder, f.neck, 3.6, 3.6, 'b', o));
    out.push(...ball(f.head, BODY.head, 'b', o));
    if (!demo.noFloor) {
      for (const k of [-3.2, 3.2]) out.push({ t: 'circle', c0: plus(f.head, side, k), r: 1.4, fill: 'face', o });
    }
    out.push(...delt(f.shoulderF, false), ...delt(f.shoulderN, false));
    out.push(...arm(f.shoulderF, f.elbowF, f.wristF, false));
    out.push(...arm(f.shoulderN, f.elbowN, f.wristN, false));
  } else {
    const front: Pt = f.face;
    // Far side first, so the near limbs overlap it.
    out.push(...arm(f.shoulder, f.elbowF, f.wristF, true));
    out.push(...leg(f.hip, f.kneeF, f.ankleF, f.toeF, true));
    out.push(...capsule(f.hip, f.shoulder, 10.4, 11.6, tone(w('torso'), false), o));
    const bodyFront = front[0] === 0 && front[1] === 0 ? LIGHT : front;
    const up: Pt = [(f.shoulder[0] - f.hip[0]) / BODY.torso, (f.shoulder[1] - f.hip[1]) / BODY.torso];
    // Chest on the front of the upper torso, glutes on the back of the hips.
    out.push(...ball(plus(along(f.shoulder, f.hip, 0.24), bodyFront, 5), 7.4, tone(w('pec'), false), o));
    out.push(...ball(plus(plus(f.hip, bodyFront, -5.2), up, 3), 8.6, tone(w('glute'), false), o));
    out.push(...leg(f.hip, f.kneeN, f.ankleN, f.toeN, false));
    out.push(...capsule(f.shoulder, f.neck, 3.6, 3.6, 'b', o));
    out.push(...ball(f.head, BODY.head, 'b', o));
    // A small nose shows which way the face points.
    out.push({ t: 'circle', c0: plus(f.head, front, 8.4), r: 2.1, fill: 'b1', o });
    out.push({ t: 'circle', c0: plus(f.head, front, 4.4), r: 1.3, fill: 'face', o });
    out.push(...delt(f.shoulder, false));
    out.push(...arm(f.shoulder, f.elbowN, f.wristN, false));
  }

  for (const p of demo.front ?? []) out.push(...propShapes(p, f).map((s) => ({ ...s, o })));
  return out;
}

/** Plain SVG markup for a frame, with fixed colours (tests and previews). */
export function frameSvg(demo: Demo, f: Frame, size = 240, worked: ReadonlySet<Part> = new Set()): string {
  const color = COLORS;
  const parts = drawFrame(demo, f, 1, worked).map((s) => {
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
      case 'ellipse':
        return `<ellipse cx="${r1(s.c0[0])}" cy="${r1(s.c0[1])}" rx="${s.rx}" ry="${s.ry}" fill="${color[s.fill]}"${op}/>`;
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
      if (s.t === 'ellipse' || (s.t === 'rect' && s.fill === 'floor')) continue;
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
