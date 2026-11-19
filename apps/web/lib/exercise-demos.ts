/**
 * Animated demonstrations for every exercise in the workout library.
 *
 * Each demo is a handful of key poses (start, the hard part, the finish) that
 * the app animates between. They are drawn by the app itself, so they cost
 * nothing to license, add nothing to download, and always match the exercise.
 * See demo-rig.ts for the coordinate system.
 */
import { BODY, type Demo, type Key, type Pose, type Prop, type Pt } from './demo-rig';

const RAD = Math.PI / 180;
/** Ankle height when standing on the floor. */
const A = 186;

const shoulderAt = (hip: Pt, torso = 180, len = 1): Pt => [
  hip[0] + Math.sin(torso * RAD) * BODY.torso * len,
  hip[1] + Math.cos(torso * RAD) * BODY.torso * len,
];

/** A target given relative to the shoulder (s) or the hip (h), or absolute. */
type T = Pt | { s: Pt } | { h: Pt };
const S = (x: number, y: number): T => ({ s: [x, y] });
const H = (x: number, y: number): T => ({ h: [x, y] });

interface PoseIn {
  hip: Pt;
  torso?: number;
  nod?: number;
  len?: number;
  hand?: T;
  handF?: T;
  foot?: T;
  footF?: T;
  toe?: number;
  toeF?: number;
}

/** Builds a pose. Far hand and foot default to just behind the near ones. */
function P(o: PoseIn): Pose {
  const torso = o.torso ?? 180;
  const s = shoulderAt(o.hip, torso, o.len ?? 1);
  const r = (t: T): Pt => {
    if ('s' in t) return [s[0] + t.s[0], s[1] + t.s[1]];
    if ('h' in t) return [o.hip[0] + t.h[0], o.hip[1] + t.h[1]];
    return t;
  };
  const handN = r(o.hand ?? S(1, 46));
  const footN = r(o.foot ?? [o.hip[0] + 2, A]);
  return {
    hip: o.hip,
    torso,
    nod: o.nod ?? 0,
    len: o.len ?? 1,
    handN,
    handF: o.handF ? r(o.handF) : [handN[0] - 4, handN[1]],
    footN,
    footF: o.footF ? r(o.footF) : [footN[0] - 4, footN[1]],
    toeN: o.toe ?? 90,
    toeF: o.toeF ?? o.toe ?? 90,
  };
}

interface RepTiming {
  /** Start → hard part. */
  down?: number;
  /** Hard part → start. */
  up?: number;
  holdStart?: number;
  holdEnd?: number;
}

/** One repetition: start, move to the end position, come back. */
function rep(start: Pose, end: Pose, labels: [string, string, string], t: RepTiming = {}): Key[] {
  return [
    { pose: start, ms: 1, hold: t.holdStart ?? 700, label: labels[0] },
    { pose: end, ms: t.down ?? 1300, hold: t.holdEnd ?? 350, label: labels[1] },
    { pose: start, ms: t.up ?? 1100, label: labels[2] },
  ];
}

/** Like rep, with an in-between pose so the limb follows a natural path. */
function rep3(start: Pose, mid: Pose, end: Pose, labels: [string, string, string], t: RepTiming = {}): Key[] {
  const down = t.down ?? 1300;
  const up = t.up ?? 1100;
  return [
    { pose: start, ms: 1, hold: t.holdStart ?? 700, label: labels[0] },
    { pose: mid, ms: down / 2, label: labels[1] },
    { pose: end, ms: down / 2, hold: t.holdEnd ?? 350, label: labels[1] },
    { pose: mid, ms: up / 2, label: labels[2] },
    { pose: start, ms: up / 2, label: labels[2] },
  ];
}

/** A held position (planks): small breathing movement, rotating cues. */
function hold(a: Pose, b: Pose, labels: string[]): Key[] {
  return labels.map((label, i) => ({ pose: i % 2 ? b : a, ms: 900, hold: 900, label }));
}

// ---------- Equipment ----------

const bench = (x: number, w: number, top = 150): Prop[] => [
  { kind: 'rect', x, y: top, w, h: 9, r: 3 },
  { kind: 'rect', x: x + 8, y: top + 9, w: 6, h: 190 - top - 9, r: 1 },
  { kind: 'rect', x: x + w - 14, y: top + 9, w: 6, h: 190 - top - 9, r: 1 },
];
const pullBar = (y: number): Prop[] => [
  { kind: 'line', a: [60, y], b: [180, y], w: 5 },
  { kind: 'line', a: [62, y], b: [62, 190], w: 3 },
  { kind: 'line', a: [178, y], b: [178, 190], w: 3 },
];
const plate = { kind: 'plate', at: 'hands', r: 14 } as const;
const dumbbells: Prop[] = [
  { kind: 'dumbbell', at: 'wristN' },
  { kind: 'dumbbell', at: 'wristF' },
];

// ---------- Standing references ----------

const stand = (x = 106, o: Partial<PoseIn> = {}): Pose => P({ hip: [x, 113], foot: [x + 2, A], ...o });

// ---------- Demos ----------

// Squat pattern
const backSquat: Demo = {
  elbows: 330,
  back: [{ kind: 'plate', at: 'shoulder', r: 15 }],
  keys: rep(
    stand(104, { hand: S(-6, 2), foot: [106, A] }),
    P({ hip: [82, 148], torso: 138, hand: S(-6, 2), foot: [106, A] }),
    ['Start: bar on upper back, feet shoulder-width', 'Sit down between your heels, chest up', 'Drive up through the whole foot'],
  ),
};

const legPress: Demo = {
  note: 'Shown on a 45° leg press',
  knees: 180,
  back: [
    { kind: 'line', a: [100, 160], b: [48, 108], w: 9 },
    { kind: 'line', a: [96, 162], b: [118, 166], w: 9 },
    { kind: 'line', a: [104, 186], b: [196, 94], w: 3 },
  ],
  front: [{ kind: 'sled', at: 'footN', angle: 225 }],
  keys: rep(
    P({ hip: [92, 152], torso: 225, hand: H(4, -2), foot: [150, 112], toe: 220 }),
    P({ hip: [92, 152], torso: 225, hand: H(4, -2), foot: [124, 128], toe: 220 }),
    ['Start: feet mid-platform, legs almost straight', 'Lower until knees reach about 90°', 'Press back up, lower back on the pad'],
  ),
};

const gobletSquat: Demo = {
  elbows: 0,
  front: [{ kind: 'kettle', at: 'hands' }],
  keys: rep(
    stand(104, { hand: S(9, 12), handF: S(7, 12), foot: [106, A] }),
    P({ hip: [84, 150], torso: 145, hand: S(10, 10), handF: S(8, 10), foot: [106, A] }),
    ['Start: one dumbbell held at your chest', 'Sit down, elbows inside the knees', 'Stand tall, squeeze your glutes'],
  ),
};

const bodyweightSquat: Demo = {
  arc: ['hands'],
  keys: rep(
    stand(104, { hand: S(30, 36), foot: [106, A] }),
    P({ hip: [82, 150], torso: 145, hand: S(46, 2), foot: [106, A] }),
    ['Start: feet shoulder-width, arms forward', 'Sit back and down, heels flat', 'Stand back up'],
    { down: 1600 },
  ),
};

// Hinge pattern
const romanianDeadlift: Demo = {
  back: [plate],
  keys: rep(
    stand(104, { hand: S(3, 44), foot: [106, A] }),
    P({ hip: [74, 120], torso: 120, hand: S(-1, 46), foot: [106, A] }),
    ['Start: stand tall, bar at your thighs', 'Push hips back, bar close to your legs', 'Squeeze glutes to stand up'],
    { down: 1600 },
  ),
};

const trapBarDeadlift: Demo = {
  back: [plate],
  keys: rep(
    P({ hip: [90, 142], torso: 145, hand: S(-1, 46), foot: [108, A] }),
    stand(106, { hand: S(1, 46), foot: [108, A] }),
    ['Start: stand in the centre, brace', 'Push the floor away', 'Lower under control'],
  ),
};

const dbRomanianDeadlift: Demo = {
  front: dumbbells,
  keys: rep(
    stand(104, { hand: S(3, 44), foot: [106, A] }),
    P({ hip: [74, 120], torso: 120, hand: S(-1, 46), foot: [106, A] }),
    ['Start: dumbbells in front of your thighs', 'Hips back, back flat', 'Stand up by squeezing your glutes'],
    { down: 1600 },
  ),
};

const lying = (hip: Pt, torso: number, o: Partial<PoseIn> = {}) => P({ hip, torso, ...o });

const gluteBridge: Demo = {
  keys: rep(
    lying([120, 180], 272, { hand: [118, A], foot: [142, A] }),
    lying([118, 158], 296, { hand: [118, A], foot: [142, A] }),
    ['Start: on your back, feet flat near your hips', 'Push through your heels to lift your hips', 'Lower slowly'],
    { holdEnd: 900 },
  ),
};

const singleLegBridge: Demo = {
  keys: rep(
    lying([120, 180], 272, { hand: [118, A], foot: H(62, -38), toe: 160, footF: [142, A], toeF: 90 }),
    lying([118, 158], 296, { hand: [118, A], foot: H(66, -16), toe: 140, footF: [142, A], toeF: 90 }),
    ['Start: one foot down, other leg straight', 'Lift your hips, keep them level', 'Lower slowly. Reps count per leg'],
    { holdEnd: 900 },
  ),
};

// Lunge pattern
const walkingLunge: Demo = {
  fadeLoop: true,
  front: dumbbells,
  keys: [
    { pose: stand(76, { hand: S(2, 46), foot: [80, A], footF: [76, A] }), ms: 500, hold: 500, label: 'Start: stand tall, dumbbells at your sides' },
    { pose: P({ hip: [94, 146], hand: S(2, 46), foot: [126, A], footF: [72, A - 4], toeF: 40 }), ms: 1300, hold: 300, label: 'Long step, back knee towards the floor' },
    { pose: P({ hip: [116, 120], hand: S(2, 46), foot: [126, A], footF: [102, 168], toeF: 60 }), ms: 800, label: 'Stand up and bring the back foot through' },
    { pose: stand(124, { hand: S(2, 46), foot: [128, A], footF: [124, A] }), ms: 600, hold: 300, label: 'Keep walking. Reps count per leg' },
  ],
};

const bulgarianSplitSquat: Demo = {
  back: bench(16, 50, 160),
  front: dumbbells,
  keys: rep(
    P({ hip: [96, 118], torso: 174, hand: S(2, 46), foot: [122, A], footF: [56, 153], toeF: 245 }),
    P({ hip: [92, 150], torso: 170, hand: S(2, 46), foot: [122, A], footF: [56, 153], toeF: 245 }),
    ['Start: back foot on a bench', 'Drop straight down', 'Drive up through the front foot. Reps per leg'],
  ),
};

const reverseLunge: Demo = {
  keys: rep(
    stand(110, { hand: S(2, 46), foot: [112, A], footF: [108, A] }),
    P({ hip: [94, 147], hand: S(2, 46), foot: [114, A], footF: [64, A - 3], toeF: 40 }),
    ['Start: stand tall', 'Step back, lower the back knee', 'Push through the front heel to return. Reps per leg'],
  ),
};

const stepUp: Demo = {
  back: [{ kind: 'rect', x: 120, y: 150, w: 56, h: 40, r: 4 }],
  keys: [
    { pose: P({ hip: [100, 113], hand: S(2, 46), foot: [134, 146], footF: [98, A] }), ms: 1, hold: 700, label: 'Start: one foot on a sturdy step' },
    { pose: P({ hip: [124, 92], hand: S(2, 46), foot: [134, 146], footF: [114, 158], toeF: 70 }), ms: 800, label: 'Push through the top foot only' },
    { pose: P({ hip: [134, 74], hand: S(2, 46), foot: [134, 146], footF: [130, 146] }), ms: 600, hold: 400, label: 'Stand tall on the step' },
    { pose: P({ hip: [124, 92], hand: S(2, 46), foot: [134, 146], footF: [114, 158], toeF: 70 }), ms: 600, label: 'Step down slowly. Reps count per leg' },
    { pose: P({ hip: [100, 113], hand: S(2, 46), foot: [134, 146], footF: [98, A] }), ms: 700, label: 'Step down slowly. Reps count per leg' },
  ],
};

// Horizontal push
const flatBench = bench(46, 100, 150);
const benchLie = (o: Partial<PoseIn>) => lying([118, 142], 270, { foot: [150, A], ...o });

const benchPress: Demo = {
  back: [...flatBench, plate],
  keys: rep(
    benchLie({ hand: [76, 97], handF: [76, 97] }),
    benchLie({ hand: [86, 124], handF: [86, 124] }),
    ['Start: shoulder blades pinched, feet planted', 'Lower to mid-chest', 'Press back up. Use a spotter or safety bars'],
  ),
};

const machineChestPress: Demo = {
  elbows: 0,
  back: [
    { kind: 'rect', x: 68, y: 140, w: 36, h: 8, r: 3 },
    { kind: 'line', a: [76, 146], b: [72, 70], w: 8 },
    { kind: 'rect', x: 82, y: 148, w: 6, h: 42, r: 1 },
  ],
  front: [
    { kind: 'lever', at: 'wristN', from: [94, 38] },
  ],
  keys: rep(
    P({ hip: [88, 136], hand: S(16, 8), handF: S(14, 8), foot: [120, A] }),
    P({ hip: [88, 136], hand: S(44, 6), handF: S(42, 6), foot: [120, A] }),
    ['Start: handles at mid-chest height', 'Press out, elbows soft at the end', 'Control the return'],
  ),
};

const dbBenchPress: Demo = {
  back: flatBench,
  front: dumbbells,
  keys: rep(
    benchLie({ hand: [76, 98], handF: [76, 98] }),
    benchLie({ hand: [82, 128], handF: [82, 128] }),
    ['Start: dumbbells over your chest', 'Lower, elbows about 45° from your body', 'Press up and slightly together'],
  ),
};

const inclineDbPress: Demo = {
  back: [
    { kind: 'line', a: [106, 158], b: [50, 125], w: 9 },
    { kind: 'rect', x: 90, y: 154, w: 30, h: 8, r: 3 },
    { kind: 'rect', x: 100, y: 162, w: 6, h: 28, r: 1 },
    { kind: 'rect', x: 56, y: 132, w: 6, h: 58, r: 1 },
  ],
  front: dumbbells,
  keys: rep(
    P({ hip: [102, 150], torso: 240, hand: S(2, -46), handF: S(2, -46), foot: [134, A] }),
    P({ hip: [102, 150], torso: 240, hand: S(14, -10), handF: S(14, -10), foot: [134, A] }),
    ['Start: bench at 30°, dumbbells up', 'Lower to your upper chest', 'Press back up, wrists over elbows'],
  ),
};

const pushUpTop = (o: Partial<PoseIn> = {}) => P({ hip: [108.6, 155], torso: 110, hand: [152, A], foot: [40, 178], toe: 30, ...o });
const pushUpBottom = (o: Partial<PoseIn> = {}) => P({ hip: [112.8, 174], torso: 94, hand: [152, A], foot: [40, 178], toe: 30, ...o });

const pushUp: Demo = {
  keys: rep(pushUpTop(), pushUpBottom(), ['Start: body in a straight line', 'Lower your chest to just above the floor', 'Push back up as one piece']),
};

// Vertical push
const overheadPress: Demo = {
  elbows: 15,
  back: [plate],
  keys: rep(
    stand(106, { hand: S(10, -2), foot: [108, A] }),
    stand(106, { hand: S(-2, -46), foot: [108, A] }),
    ['Start: bar at your collarbones, glutes squeezed', 'Press up and slightly back', 'Lower under control'],
  ),
};

const seatedBench = (x: number): Prop[] => [
  { kind: 'rect', x: x - 14, y: 140, w: 30, h: 8, r: 3 },
  { kind: 'line', a: [x - 10, 146], b: [x - 14, 74], w: 8 },
  { kind: 'rect', x: x - 4, y: 148, w: 6, h: 42, r: 1 },
];

const dbShoulderPress: Demo = {
  elbows: 0,
  back: seatedBench(90),
  front: dumbbells,
  keys: rep(
    P({ hip: [90, 136], hand: S(6, -4), handF: S(4, -4), foot: [122, A] }),
    P({ hip: [90, 136], hand: S(4, -46), handF: S(2, -46), foot: [122, A] }),
    ['Start: back on the bench, dumbbells at ear height', 'Press up without arching your back', 'Lower back to your ears'],
  ),
};

const pikePushUp: Demo = {
  elbows: 'front',
  keys: rep(
    P({ hip: [104, 118], torso: 53, hand: [150, A], foot: [68, 180], toe: 40 }),
    P({ hip: [104, 118], torso: 32, nod: -10, hand: [150, A], foot: [68, 180], toe: 40 }),
    ['Start: hips high, body in an upside-down V', 'Lower your head towards your hands', 'Push back up'],
  ),
};

// Horizontal pull
const seatedCableRow: Demo = {
  back: [
    { kind: 'rect', x: 56, y: 158, w: 48, h: 9, r: 3 },
    { kind: 'rect', x: 74, y: 167, w: 8, h: 23, r: 1 },
    { kind: 'line', a: [138, 158], b: [138, 190], w: 5 },
  ],
  front: [{ kind: 'cable', at: 'hands', from: [206, 178] }],
  keys: rep(
    P({ hip: [80, 156], torso: 166, hand: [132, 128], foot: [130, 176] }),
    P({ hip: [80, 156], torso: 184, hand: [100, 138], foot: [130, 176] }),
    ['Start: sit tall, arms reaching forward', 'Pull to your belly button', 'Squeeze shoulder blades, then reach forward'],
  ),
};

const rowHinge = (hand: T) => P({ hip: [84, 118], torso: 130, hand, foot: [108, A] });

const barbellRow: Demo = {
  back: [plate],
  keys: rep(rowHinge(S(1, 46)), rowHinge([102, 118]), ['Start: hinge to about 45°, back flat', 'Pull the bar to your lower ribs', 'Lower with control, no jerking']),
};

const oneArmDbRow: Demo = {
  back: bench(58, 110, 158),
  front: [{ kind: 'dumbbell', at: 'wristN' }],
  keys: rep(
    P({ hip: [96, 118], torso: 100, hand: S(-1, 46), handF: [144, 156], foot: [92, A], footF: [68, 152], toeF: 270 }),
    P({ hip: [96, 118], torso: 100, hand: [108, 126], handF: [144, 156], foot: [92, A], footF: [68, 152], toeF: 270 }),
    ['Start: hand and knee on a bench', 'Pull the dumbbell to your hip', 'Lower slowly. Reps count per arm'],
  ),
};

const invertedRow: Demo = {
  back: [
    { kind: 'rect', x: 14, y: 112, w: 82, h: 7, r: 2 },
    { kind: 'rect', x: 18, y: 119, w: 6, h: 71, r: 1 },
    { kind: 'rect', x: 50, y: 119, w: 6, h: 71, r: 1 },
  ],
  keys: rep(
    P({ hip: [135.5, 169.7], torso: 260.4, hand: [90, 120], handF: [86, 120], foot: [208, 182], toe: 170 }),
    P({ hip: [141.8, 151.3], torso: 245.2, hand: [90, 120], handF: [86, 120], foot: [208, 182], toe: 170 }),
    ['Start: under a sturdy table, arms straight', 'Pull your chest to the edge', 'Lower slowly, body straight'],
  ),
};

const backpackRow: Demo = {
  note: 'A backpack filled with books',
  front: [{ kind: 'bag', at: 'hands' }],
  keys: rep(rowHinge(S(1, 44)), rowHinge([102, 116]), ['Start: hinge forward, back flat', 'Pull the backpack to your belly', 'Lower with control']),
};

// Vertical pull
const latPulldown: Demo = {
  elbows: 0,
  back: [
    { kind: 'rect', x: 76, y: 140, w: 34, h: 8, r: 3 },
    { kind: 'rect', x: 90, y: 148, w: 6, h: 42, r: 1 },
    { kind: 'rect', x: 108, y: 118, w: 22, h: 8, r: 3 },
  ],
  front: [{ kind: 'cable', at: 'hands', from: [106, 6] }],
  keys: rep(
    P({ hip: [92, 136], torso: 174, hand: S(6, -45), foot: [126, A] }),
    P({ hip: [92, 136], torso: 168, hand: S(14, 6), foot: [126, A] }),
    ['Start: hands a little wider than shoulders', 'Pull the bar to your upper chest', 'Let it rise slowly, arms straight'],
  ),
};

const pullUp: Demo = {
  elbows: 10,
  back: pullBar(24),
  keys: rep(
    P({ hip: [116, 118], hand: [120, 26], handF: [116, 26], foot: [100, 170], footF: [96, 166] }),
    P({ hip: [112, 82], hand: [124, 25], handF: [120, 25], foot: [96, 134], footF: [92, 130] }),
    ['Start: dead hang, arms straight', 'Pull until your chin is over the bar', 'Lower all the way down'],
  ),
};

const dbPullover: Demo = {
  arc: ['hands'],
  elbows: 'front',
  back: bench(46, 76, 150),
  front: [{ kind: 'dumbbell', at: 'hands' }],
  keys: rep(
    lying([120, 155], 256.7, { hand: [80, 99], handF: [80, 99], foot: [152, A] }),
    lying([120, 155], 256.7, { hand: [34, 150], handF: [34, 150], foot: [152, A] }),
    ['Start: across a bench, dumbbell over your chest', 'Lower behind your head, elbows soft', 'Pull it back over your chest'],
    { down: 1600 },
  ),
};

const supermanPull: Demo = {
  elbows: 275,
  keys: rep(
    P({ hip: [96, 180], torso: 90, hand: [190, 178], handF: [186, 178], foot: [26, 184], toe: 300 }),
    P({ hip: [96, 180], torso: 98, nod: 8, hand: [150, 158], handF: [146, 158], foot: [26, 184], toe: 300 }),
    ['Start: face down, arms overhead', 'Lift your chest, pull elbows to your sides', 'Hold 2 seconds, then reach forward'],
    { holdEnd: 1200 },
  ),
};

// Shoulders
const frontStand = (o: Partial<PoseIn> = {}) => P({ hip: [120, 113], foot: [133, A], footF: [107, A], toe: 90, toeF: 90, ...o });

const lateralRaise: Demo = {
  view: 'front',
  note: 'Seen from the front',
  elbows: 0,
  arc: ['hands'],
  front: dumbbells,
  keys: rep(
    frontStand({ hand: [141, 112], handF: [99, 112] }),
    frontStand({ hand: [176, 70], handF: [64, 70] }),
    ['Start: dumbbells at your sides, elbows soft', 'Raise to shoulder height', 'Lower slowly'],
  ),
};

const facePull: Demo = {
  elbows: 230,
  front: [{ kind: 'cable', at: 'hands', from: [212, 56] }],
  keys: rep(
    stand(104, { hand: S(42, -8), foot: [106, A] }),
    stand(104, { hand: S(8, -16), foot: [106, A] }),
    ['Start: rope at face height, arms straight', 'Pull towards your eyes, elbows high', 'Squeeze 1 second, then let it go forward'],
    { holdEnd: 900 },
  ),
};

const rearDeltFly: Demo = {
  view: 'front',
  note: 'Seen from the front, bent forward',
  elbows: 0,
  arc: ['hands'],
  front: dumbbells,
  keys: rep(
    P({ hip: [120, 124], len: 0.45, foot: [131, A], footF: [109, A], hand: [128, 148], handF: [112, 148] }),
    P({ hip: [120, 124], len: 0.45, foot: [131, A], footF: [109, A], hand: [176, 112], handF: [64, 112] }),
    ['Start: hinge forward, chest down', 'Open your arms wide, thumbs forward', 'Lower slowly, light weight'],
  ),
};

const topDown = (hand: Pt, handF: Pt) => P({ hip: [120, 120], foot: [114, 192], footF: [126, 192], toe: 180, toeF: 180, hand, handF });

const ytwRaise: Demo = {
  view: 'front',
  noFloor: true,
  note: 'Seen from above, lying face down',
  elbows: 300,
  keys: [
    { pose: topDown([131, 120], [109, 120]), ms: 900, hold: 400, label: 'Start: face down, arms by your sides' },
    { pose: topDown([158, 36], [82, 36]), ms: 1000, hold: 700, label: 'Y: arms overhead, thumbs up, lift' },
    { pose: topDown([178, 76], [62, 76]), ms: 800, hold: 700, label: 'T: arms out to the sides, lift' },
    { pose: topDown([150, 66], [90, 66]), ms: 800, hold: 700, label: 'W: elbows bent and pulled down, lift' },
  ],
};

// Biceps
const curlStand = (hand: T) => stand(104, { hand, foot: [106, A] });

const curlKeys = (labels: [string, string, string]) =>
  rep3(curlStand(S(4, 46)), curlStand(S(24, 24)), curlStand(S(16, 4)), labels, { down: 1000, up: 1400 });

const dbCurl: Demo = {
  front: dumbbells,
  keys: curlKeys(['Start: elbows pinned to your sides', 'Curl up, turning the palm up', 'Lower for 2 seconds']),
};

const cableCurl: Demo = {
  front: [{ kind: 'cable', at: 'hands', from: [196, 184] }],
  keys: curlKeys(['Start: stand tall, elbows still', 'Curl up and squeeze at the top', 'Control the way down']),
};

const hammerCurl: Demo = {
  front: [
    { kind: 'kettle', at: 'wristN' },
    { kind: 'kettle', at: 'wristF' },
  ],
  keys: curlKeys(['Start: palms facing each other', 'Curl up, elbows still', 'Lower without swinging']),
};

const backpackCurl: Demo = {
  note: 'A loaded backpack held by the handle',
  front: [{ kind: 'bag', at: 'hands' }],
  keys: curlKeys(['Start: elbows at your sides', 'Curl the backpack up', 'Lower slowly']),
};

// Triceps
const tricepsPushdown: Demo = {
  elbows: 350,
  front: [{ kind: 'cable', at: 'hands', from: [142, 12] }],
  keys: rep3(
    stand(104, { torso: 174, hand: S(14, 4), foot: [106, A] }),
    stand(104, { torso: 174, hand: S(22, 26), foot: [106, A] }),
    stand(104, { torso: 174, hand: S(5, 46), foot: [106, A] }),
    ['Start: elbows by your sides', 'Push down until arms are straight', 'Only the forearms move'],
  ),
};

const overheadDbExtension: Demo = {
  elbows: 'front',
  front: [{ kind: 'kettle', at: 'hands' }],
  keys: rep3(
    stand(104, { hand: S(2, -47), foot: [106, A] }),
    stand(104, { hand: S(-16, -38), foot: [106, A] }),
    stand(104, { hand: S(-16, -10), foot: [106, A] }),
    ['Start: dumbbell overhead in both hands', 'Lower behind your head, elbows forward', 'Straighten your arms'],
  ),
};

const benchDip: Demo = {
  back: bench(30, 62, 140),
  keys: rep(
    P({ hip: [94, 140], hand: [88, 140], handF: [84, 140], foot: [142, A] }),
    P({ hip: [96, 164], hand: [88, 140], handF: [84, 140], foot: [142, A] }),
    ['Start: hands on a bench behind you', 'Lower until elbows reach 90°', 'Push back up. Bend knees to make it easier'],
  ),
};

const closeGripPushUp: Demo = {
  elbows: 'back',
  keys: rep(
    pushUpTop({ hand: [148, A] }),
    pushUpBottom({ hand: [148, A] }),
    ['Start: hands under your shoulders', 'Lower, elbows brushing your ribs', 'Push back up. Knees down if needed'],
  ),
};

// Calves
const calfStep = (x: number): Prop[] => [{ kind: 'rect', x, y: 176, w: 46, h: 14, r: 3 }];

const standingCalfRaise: Demo = {
  elbows: 0,
  back: [...calfStep(110), { kind: 'line', a: [76, 20], b: [76, 190], w: 5 }],
  front: [{ kind: 'pad', at: 'shoulder' }],
  keys: rep(
    P({ hip: [110, 107], hand: S(8, -2), foot: [112, 180], toe: 112 }),
    P({ hip: [113, 94], hand: S(8, -2), foot: [115, 167], toe: 45 }),
    ['Start: heels low, full stretch', 'Rise high onto your toes', 'Pause 1 second, then lower'],
    { holdEnd: 900 },
  ),
};

const singleLegCalfRaise: Demo = {
  back: [...calfStep(124), { kind: 'rect', x: 172, y: 20, w: 8, h: 170, r: 2 }],
  keys: rep(
    P({ hip: [128, 107], hand: [170, 72], handF: [166, 74], foot: [130, 180], toe: 112, footF: H(-26, 52), toeF: 120 }),
    P({ hip: [131, 94], hand: [170, 72], handF: [166, 74], foot: [133, 167], toe: 45, footF: H(-26, 52), toeF: 120 }),
    ['Start: on a step, hold a wall, heel low', 'Rise high onto your toes', 'Lower slowly. Reps count per leg'],
    { holdEnd: 900 },
  ),
};

// Core
const plankPose = (dy: number) => P({ hip: [112, 169 + dy], torso: 98.7, hand: [181, A], handF: [177, A], foot: [40, 180], toe: 30 });

const plank: Demo = {
  elbows: 'front',
  keys: hold(plankPose(0), plankPose(-1.5), ['Forearms down, body straight', 'Squeeze glutes, ribs down', 'Breathe normally and hold']),
};

const deadBugStart = () =>
  lying([130, 180], 270, { hand: [86, 134], handF: [82, 134], foot: [166, 142], footF: [162, 142], toe: 90 });

const deadBug: Demo = {
  arc: ['hands', 'feet'],
  keys: [
    { pose: deadBugStart(), ms: 900, hold: 500, label: 'Start: back flat, arms up, knees over hips' },
    {
      pose: lying([130, 180], 270, { hand: [42, 172], handF: [82, 134], foot: [166, 142], footF: [200, 174], toe: 90, toeF: 100 }),
      ms: 1400,
      hold: 300,
      label: 'Lower opposite arm and leg slowly',
    },
    { pose: deadBugStart(), ms: 1100, hold: 400, label: 'Back to the start' },
    {
      pose: lying([130, 180], 270, { hand: [86, 134], handF: [38, 172], foot: [200, 174], footF: [162, 142], toe: 100, toeF: 90 }),
      ms: 1400,
      hold: 300,
      label: 'Now the other side. Lower back stays down',
    },
  ],
};

const cableCrunch: Demo = {
  elbows: 'back',
  front: [{ kind: 'cable', at: 'hands', from: [206, 14] }],
  keys: rep(
    P({ hip: [110, 140], torso: 172, hand: S(8, -9), foot: [78, 182], toe: 270, footF: [74, 182], toeF: 270 }),
    P({ hip: [110, 140], torso: 112, nod: 25, hand: S(10, -2), foot: [78, 182], toe: 270, footF: [74, 182], toeF: 270 }),
    ['Start: kneel, rope beside your head', 'Curl your ribs towards your hips', 'Uncurl slowly, hips stay still'],
  ),
};

const sidePlank: Demo = {
  view: 'front',
  note: 'Seen from the front',
  elbows: 315,
  elbowF: 315,
  keys: [
    {
      pose: P({ hip: [116, 176], torso: 100, hand: [182, A], handF: [116, 132], foot: [40, 184], footF: [38, 178], toe: 0, toeF: 0 }),
      ms: 900,
      hold: 500,
      label: 'Start: on your side, elbow under shoulder',
    },
    {
      pose: P({ hip: [110, 162], torso: 106, hand: [182, A], handF: [150, 90], foot: [40, 184], footF: [38, 178], toe: 0, toeF: 0 }),
      ms: 1200,
      hold: 1600,
      label: 'Lift your hips high, body straight. Hold',
    },
  ],
};

const hangingKneeRaise: Demo = {
  elbows: 10,
  knees: 160,
  back: pullBar(12),
  keys: rep(
    P({ hip: [116, 106], hand: [120, 14], handF: [116, 14], foot: [118, 178], footF: [114, 176] }),
    P({ hip: [118, 108], torso: 186, hand: [120, 14], handF: [116, 14], foot: H(22, 4), footF: H(18, 4) }),
    ['Start: hang from the bar, no swinging', 'Bring your knees up to your chest', 'Lower slowly'],
  ),
};

// Conditioning
const crank: Pt = [112, 160];
const pedal = (deg: number): Pt => [crank[0] + Math.cos(deg * RAD) * 13, crank[1] + Math.sin(deg * RAD) * 13];
const riderAt = (deg: number) => P({ hip: [102, 102], torso: 135, hand: [156, 104], handF: [152, 104], foot: pedal(deg), footF: pedal(deg + 180), toe: 100 });

const bikeKeys = (label: string, ms: number, turns: number): Key[] =>
  Array.from({ length: 8 * turns }, (_, i) => ({ pose: riderAt(45 * (i + 1)), ms, label }));

const bikeIntervals: Demo = {
  note: 'Shown on a bike; a rower works too',
  linear: true,
  back: [
    { kind: 'ring', c: [60, 168], r: 21 },
    { kind: 'ring', c: [172, 168], r: 21 },
    { kind: 'line', a: [60, 168], b: [112, 160], w: 3 },
    { kind: 'line', a: [102, 108], b: [112, 160], w: 4 },
    { kind: 'line', a: [112, 160], b: [160, 116], w: 4 },
    { kind: 'line', a: [104, 120], b: [160, 116], w: 4 },
    { kind: 'line', a: [104, 120], b: [60, 168], w: 3 },
    { kind: 'line', a: [160, 116], b: [172, 168], w: 4 },
    { kind: 'line', a: [160, 116], b: [158, 102], w: 4 },
    { kind: 'line', a: [150, 102], b: [164, 102], w: 5 },
    { kind: 'rect', x: 90, y: 104, w: 22, h: 6, r: 3 },
  ],
  keys: [...bikeKeys('Hard: 30 seconds, only a few words possible', 110, 3), ...bikeKeys('Easy: 90 seconds to recover', 260, 2)],
};

const walkPose = (n: Pt, f: Pt, nToe: number, fToe: number, armSwing: number, bob: number) =>
  P({ hip: [110, 114 + bob], foot: n, footF: f, toe: nToe, toeF: fToe, hand: S(armSwing, 45), handF: S(-armSwing, 45) });

const brisk: Demo = {
  note: 'Stairs or step-ups work too',
  linear: true,
  arc: ['hands'],
  keys: [
    { pose: walkPose([132, A - 2], [90, A - 2], 115, 50, -14, 1), ms: 260, label: 'Brisk pace: breathing hard but able to talk' },
    { pose: walkPose([112, A], [108, 168], 90, 60, 0, -2), ms: 260, label: 'Brisk pace: breathing hard but able to talk' },
    { pose: walkPose([90, A - 2], [132, A - 2], 50, 115, 14, 1), ms: 260, label: 'Brisk pace: breathing hard but able to talk' },
    { pose: walkPose([108, 168], [112, A], 60, 90, 0, -2), ms: 260, label: 'Stop if you feel dizzy or chest pain' },
  ],
};

export const DEMOS: Readonly<Record<string, Demo>> = {
  back_squat: backSquat,
  leg_press: legPress,
  goblet_squat: gobletSquat,
  bodyweight_squat: bodyweightSquat,
  romanian_deadlift: romanianDeadlift,
  trap_bar_deadlift: trapBarDeadlift,
  db_romanian_deadlift: dbRomanianDeadlift,
  glute_bridge: gluteBridge,
  single_leg_bridge: singleLegBridge,
  walking_lunge: walkingLunge,
  bulgarian_split_squat: bulgarianSplitSquat,
  reverse_lunge: reverseLunge,
  step_up: stepUp,
  bench_press: benchPress,
  machine_chest_press: machineChestPress,
  db_bench_press: dbBenchPress,
  incline_db_press: inclineDbPress,
  push_up: pushUp,
  overhead_press: overheadPress,
  db_shoulder_press: dbShoulderPress,
  pike_push_up: pikePushUp,
  seated_cable_row: seatedCableRow,
  barbell_row: barbellRow,
  one_arm_db_row: oneArmDbRow,
  inverted_row: invertedRow,
  backpack_row: backpackRow,
  lat_pulldown: latPulldown,
  pull_up: pullUp,
  db_pullover: dbPullover,
  superman_pull: supermanPull,
  lateral_raise: lateralRaise,
  face_pull: facePull,
  rear_delt_fly: rearDeltFly,
  ytw_raise: ytwRaise,
  db_curl: dbCurl,
  cable_curl: cableCurl,
  hammer_curl: hammerCurl,
  backpack_curl: backpackCurl,
  triceps_pushdown: tricepsPushdown,
  overhead_db_extension: overheadDbExtension,
  bench_dip: benchDip,
  close_grip_push_up: closeGripPushUp,
  standing_calf_raise: standingCalfRaise,
  single_leg_calf_raise: singleLegCalfRaise,
  plank,
  dead_bug: deadBug,
  cable_crunch: cableCrunch,
  side_plank: sidePlank,
  hanging_knee_raise: hangingKneeRaise,
  bike_intervals: bikeIntervals,
  brisk_circuit: brisk,
};

export function demoFor(exerciseId: string): Demo | undefined {
  return DEMOS[exerciseId];
}
