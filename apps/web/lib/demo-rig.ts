/**
 * A tiny 2D "rig" that turns exercise demo key poses into drawable frames.
 *
 * Every demo is drawn by the app itself (no downloaded GIFs), so there is no
 * licence to worry about, nothing extra to download, and each animation shows
 * exactly the exercise it belongs to.
 *
 * Coordinates are SVG units in a 240 × 200 box, y pointing down, floor at
 * y = 190. A pose places the hips and the hands and feet; the elbows and knees
 * are worked out (two-bone inverse kinematics), so planted feet and hands stay
 * put while the body moves.
 *
 * Angles are in degrees: 0 points straight down, 90 points right (the way a
 * standing figure faces), 180 points straight up.
 */

export type Pt = readonly [number, number];

export const VIEW_W = 240;
export const VIEW_H = 200;
export const FLOOR = 190;

/** Limb lengths in SVG units. */
export const BODY = {
  torso: 46,
  neck: 5,
  head: 9,
  upperArm: 25,
  forearm: 23,
  thigh: 38,
  shin: 36,
  foot: 13,
} as const;

/**
 * Where a limb's middle joint bends: towards the chest side, the back, or an
 * absolute direction in degrees (for reclined or upside-down positions).
 */
export type Bend = 'front' | 'back' | number;

export interface Pose {
  /** Hip joint. */
  hip: Pt;
  /** Hip-to-shoulder direction. 180 = upright. */
  torso: number;
  /** Head tilt relative to the torso (nod). Default 0. */
  nod?: number;
  /** Torso length factor, below 1 when the torso leans towards the viewer. */
  len?: number;
  /** Wrist targets: N is the near side (drawn in front), F the far side. */
  handN: Pt;
  handF: Pt;
  /** Ankle targets. */
  footN: Pt;
  footF: Pt;
  /** Ankle-to-toe direction. Default 90 (flat, toes forward). */
  toeN?: number;
  toeF?: number;
}

export interface Key {
  pose: Pose;
  /** Milliseconds to move here from the previous key. */
  ms: number;
  /** Milliseconds to stay here once reached. */
  hold?: number;
  /** Caption shown while moving to and holding this key. */
  label: string;
}

export type Prop =
  | { kind: 'plate'; at: Joint; r?: number }
  | { kind: 'dumbbell'; at: Joint }
  | { kind: 'kettle'; at: Joint }
  | { kind: 'bag'; at: Joint }
  | { kind: 'handle'; at: Joint }
  | { kind: 'cable'; at: Joint; from: Pt }
  | { kind: 'lever'; at: Joint; from: Pt }
  | { kind: 'pad'; at: Joint }
  | { kind: 'sled'; at: Joint; angle: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r?: number }
  | { kind: 'line'; a: Pt; b: Pt; w?: number }
  | { kind: 'ring'; c: Pt; r: number };

export type Joint = 'wristN' | 'wristF' | 'hands' | 'shoulder' | 'chest' | 'toeN' | 'toeF' | 'footN' | 'ankleN' | 'kneeN' | 'hip';

export interface Demo {
  /** Short note on what the drawing shows, e.g. "Shown with a backpack". */
  note?: string;
  /** Bend direction for elbows and knees. Defaults: elbows back, knees front. */
  elbows?: Bend;
  knees?: Bend;
  /** Far arm/leg elbow or knee bend, when it differs from the near one. */
  elbowF?: Bend;
  /** Props drawn behind the figure (bench, machine frame). */
  back?: Prop[];
  /** Props drawn on top (weights in the hands). */
  front?: Prop[];
  /** Fade out and in when the loop restarts (moves that travel). */
  fadeLoop?: boolean;
  /**
   * 'side' (default) shows the body from the side. 'front' shows it facing
   * you (or from above, for moves done lying face down), with two shoulders
   * and two hips; the far limbs mirror the near ones.
   */
  view?: 'side' | 'front';
  /** Hide the floor line (views from above). */
  noFloor?: boolean;
  /** Move hands (and/or feet) around the shoulder (hip) in an arc. */
  arc?: ('hands' | 'feet')[];
  /** Even speed between keys, for cycles like pedalling and walking. */
  linear?: boolean;
  keys: Key[];
}

export interface Frame {
  front: boolean;
  hip: Pt;
  shoulder: Pt;
  /** Shoulder and hip joints each limb starts from (differ in front view). */
  shoulderN: Pt;
  shoulderF: Pt;
  hipN: Pt;
  hipF: Pt;
  /** Sideways unit vector in front view (shoulder line direction). */
  side: Pt;
  neck: Pt;
  head: Pt;
  /** Unit vector the face points to. */
  face: Pt;
  elbowN: Pt;
  wristN: Pt;
  elbowF: Pt;
  wristF: Pt;
  kneeN: Pt;
  ankleN: Pt;
  toeN: Pt;
  kneeF: Pt;
  ankleF: Pt;
  toeF: Pt;
  /** How far each wrist/ankle ended up from its target (0 when reachable). */
  miss: number;
}

const RAD = Math.PI / 180;
export const dir = (deg: number): Pt => [Math.sin(deg * RAD), Math.cos(deg * RAD)];
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/**
 * Two-bone IK: the middle joint for a limb from `root` towards `target`,
 * on the side that points most along `prefer`. Returns the middle joint, the
 * end joint actually reached, and how far that end is from the target.
 */
export function solveLimb(root: Pt, target: Pt, a: number, b: number, prefer: Pt): { mid: Pt; end: Pt; miss: number } {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const d0 = Math.hypot(dx, dy);
  const d = Math.min(Math.max(d0, Math.abs(a - b) + 1e-6), a + b - 1e-6);
  const base = Math.atan2(dy, dx);
  const cos = (a * a + d * d - b * b) / (2 * a * d);
  const off = Math.acos(Math.max(-1, Math.min(1, cos)));
  const m1: Pt = [root[0] + a * Math.cos(base + off), root[1] + a * Math.sin(base + off)];
  const m2: Pt = [root[0] + a * Math.cos(base - off), root[1] + a * Math.sin(base - off)];
  const score = (m: Pt) => (m[0] - root[0]) * prefer[0] + (m[1] - root[1]) * prefer[1];
  const mid = score(m1) >= score(m2) ? m1 : m2;
  const ux = d0 > 1e-9 ? dx / d0 : 1;
  const uy = d0 > 1e-9 ? dy / d0 : 0;
  const end: Pt = [root[0] + ux * d, root[1] + uy * d];
  return { mid, end, miss: dist(end, target) };
}

const SHOULDER_HALF = 11;
const HIP_HALF = 7;

/** Turns a pose into joint positions. */
export function solve(p: Pose, demo: Pick<Demo, 'elbows' | 'knees' | 'elbowF' | 'view'> = {}): Frame {
  const isFront = demo.view === 'front';
  const shoulder = add(p.hip, dir(p.torso), BODY.torso * (p.len ?? 1));
  // The chest faces 90° clockwise from the hip-to-shoulder line. In front
  // view the same direction runs along the shoulders.
  const front = dir(p.torso - 90);
  const back: Pt = [-front[0], -front[1]];
  const nod = p.nod ?? 0;
  const neck = add(shoulder, dir(p.torso + nod), BODY.neck);
  const head = add(neck, dir(p.torso + nod), BODY.head);
  const face: Pt = isFront ? [0, 0] : dir(p.torso + nod - 90);
  const side = front;
  const shoulderN = isFront ? add(shoulder, side, SHOULDER_HALF) : shoulder;
  const shoulderF = isFront ? add(shoulder, side, -SHOULDER_HALF) : shoulder;
  const hipN = isFront ? add(p.hip, side, HIP_HALF) : p.hip;
  const hipF = isFront ? add(p.hip, side, -HIP_HALF) : p.hip;
  // In front view an absolute bend on the far side is mirrored across the body.
  const axis = p.torso;
  const pref = (b: Bend, far: boolean): Pt => {
    // Front view: 'front' bends outwards (away from the body), 'back' inwards.
    if (isFront && (b === 'front' || b === 'back')) {
      const out = (b === 'front') !== far ? 1 : -1;
      return [side[0] * out, side[1] * out];
    }
    if (b === 'front') return front;
    if (b === 'back') return back;
    return dir(far && isFront ? 2 * axis - b : b);
  };
  const elbowN = demo.elbows ?? 'back';
  const elbowF = demo.elbowF ?? elbowN;
  const knee = demo.knees ?? 'front';
  const an = solveLimb(shoulderN, p.handN, BODY.upperArm, BODY.forearm, pref(elbowN, false));
  const af = solveLimb(shoulderF, p.handF, BODY.upperArm, BODY.forearm, pref(elbowF, true));
  const ln = solveLimb(hipN, p.footN, BODY.thigh, BODY.shin, pref(knee, false));
  const lf = solveLimb(hipF, p.footF, BODY.thigh, BODY.shin, pref(knee, true));
  return {
    front: isFront,
    hip: p.hip,
    shoulder,
    shoulderN,
    shoulderF,
    hipN,
    hipF,
    side,
    neck,
    head,
    face,
    elbowN: an.mid,
    wristN: an.end,
    elbowF: af.mid,
    wristF: af.end,
    kneeN: ln.mid,
    ankleN: ln.end,
    toeN: add(ln.end, dir(p.toeN ?? 90), BODY.foot),
    kneeF: lf.mid,
    ankleF: lf.end,
    toeF: add(lf.end, dir(p.toeF ?? 90), BODY.foot),
    miss: Math.max(an.miss, af.miss, ln.miss, lf.miss),
  };
}

/** Smooth start and stop, like a controlled rep. */
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Shortest-way angle blend, so 170° → -170° doesn't spin the long way. */
function lerpAngle(a: number, b: number, t: number): number {
  let d = (((b - a) % 360) + 540) % 360 - 180;
  if (Math.abs(d) === 180) d = b - a;
  return a + d * t;
}

const shoulderOf = (p: Pose): Pt => add(p.hip, dir(p.torso), BODY.torso * (p.len ?? 1));

/** Blend a point held relative to a moving centre, along an arc around it. */
function arcPt(ca: Pt, a: Pt, cb: Pt, b: Pt, c: Pt, t: number): Pt {
  const aa = Math.atan2(a[1] - ca[1], a[0] - ca[0]);
  const ab = Math.atan2(b[1] - cb[1], b[0] - cb[0]);
  let d = ab - aa;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const ang = aa + d * t;
  const r = lerp(dist(a, ca), dist(b, cb), t);
  return [c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)];
}

export function blend(a: Pose, b: Pose, t: number, arc: Demo['arc'] = []): Pose {
  const out: Pose = {
    hip: lerpPt(a.hip, b.hip, t),
    torso: lerpAngle(a.torso, b.torso, t),
    nod: lerp(a.nod ?? 0, b.nod ?? 0, t),
    len: lerp(a.len ?? 1, b.len ?? 1, t),
    handN: lerpPt(a.handN, b.handN, t),
    handF: lerpPt(a.handF, b.handF, t),
    footN: lerpPt(a.footN, b.footN, t),
    footF: lerpPt(a.footF, b.footF, t),
    toeN: lerpAngle(a.toeN ?? 90, b.toeN ?? 90, t),
    toeF: lerpAngle(a.toeF ?? 90, b.toeF ?? 90, t),
  };
  if (arc.includes('hands')) {
    const sa = shoulderOf(a);
    const sb = shoulderOf(b);
    const s = shoulderOf(out);
    out.handN = arcPt(sa, a.handN, sb, b.handN, s, t);
    out.handF = arcPt(sa, a.handF, sb, b.handF, s, t);
  }
  if (arc.includes('feet')) {
    out.footN = arcPt(a.hip, a.footN, b.hip, b.footN, out.hip, t);
    out.footF = arcPt(a.hip, a.footF, b.hip, b.footF, out.hip, t);
  }
  return out;
}

/** Length of one loop in milliseconds. */
export function cycleMs(demo: Demo): number {
  return demo.keys.reduce((n, k) => n + k.ms + (k.hold ?? 0), 0);
}

export interface Sample {
  pose: Pose;
  /** Index of the key whose caption applies. */
  key: number;
  /** 0–1 opacity, for moves that fade on loop. */
  opacity: number;
}

/**
 * The pose at time `ms` into the loop. Key 0 is the start position: the loop
 * moves from the last key back to key 0 using key 0's `ms`.
 */
export function sample(demo: Demo, ms: number): Sample {
  const keys = demo.keys;
  const total = cycleMs(demo);
  let t = ((ms % total) + total) % total;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]!;
    const prev = keys[(i - 1 + keys.length) % keys.length]!;
    if (t < k.ms) {
      const f = demo.linear ? t / k.ms : ease(t / k.ms);
      let opacity = 1;
      // A travelling move fades out and back in instead of sliding home.
      if (demo.fadeLoop && i === 0) {
        opacity = Math.abs(1 - 2 * (t / k.ms));
        return { pose: t / k.ms < 0.5 ? prev.pose : k.pose, key: 0, opacity };
      }
      return { pose: blend(prev.pose, k.pose, f, demo.arc), key: i, opacity };
    }
    t -= k.ms;
    if (t < (k.hold ?? 0)) return { pose: k.pose, key: i, opacity: 1 };
    t -= k.hold ?? 0;
  }
  return { pose: keys[0]!.pose, key: 0, opacity: 1 };
}

/** Where a prop attached to a joint sits in this frame. */
export function jointAt(f: Frame, j: Joint): Pt {
  switch (j) {
    case 'wristN':
      return f.wristN;
    case 'wristF':
      return f.wristF;
    case 'hands':
      return lerpPt(f.wristN, f.wristF, 0.5);
    case 'shoulder':
      return f.shoulder;
    case 'chest':
      return lerpPt(f.shoulder, f.hip, 0.2);
    case 'toeN':
      return f.toeN;
    case 'toeF':
      return f.toeF;
    case 'footN':
      return lerpPt(f.ankleN, f.toeN, 0.5);
    case 'ankleN':
      return f.ankleN;
    case 'kneeN':
      return f.kneeN;
    case 'hip':
      return f.hip;
  }
}
