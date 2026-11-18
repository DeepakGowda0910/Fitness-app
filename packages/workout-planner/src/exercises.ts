/**
 * The exercise library. Every exercise in a program comes from here, so the
 * app never suggests a movement it cannot explain.
 */

/** Where the user trains. Each level includes everything below it. */
export type Equipment = 'gym' | 'dumbbells' | 'bodyweight';

export type Pattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'h_push'
  | 'v_push'
  | 'h_pull'
  | 'v_pull'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'calves'
  | 'core'
  | 'conditioning';

/** How the weight is added, which decides the step when it goes up. */
export type LoadType = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  /** Compound lifts get lower reps and longer rests than isolation work. */
  kind: 'compound' | 'isolation';
  load: LoadType;
  /** The least equipment it needs. */
  needs: Equipment;
  /** Lower body moves take bigger weight jumps. */
  body: 'upper' | 'lower' | 'core';
  /** Beginners are given only `beginner` exercises. */
  level: 'beginner' | 'intermediate';
  muscles: string;
  /** Short form cues shown under the exercise. */
  cues: string[];
  /** Timed instead of counted (planks, carries, conditioning). */
  timed?: boolean;
}

const RANK: Record<Equipment, number> = { bodyweight: 0, dumbbells: 1, gym: 2 };

export function canUse(e: Exercise, equipment: Equipment): boolean {
  return RANK[e.needs] <= RANK[equipment];
}

const ex = (e: Exercise): Exercise => e;

export const EXERCISES: readonly Exercise[] = [
  // ----- Squat -----
  ex({ id: 'back_squat', name: 'Barbell back squat', pattern: 'squat', kind: 'compound', load: 'barbell', needs: 'gym', body: 'lower', level: 'intermediate', muscles: 'Quads, glutes', cues: ['Bar on upper back, feet shoulder-width', 'Sit down between your heels, chest up', 'Drive up through the whole foot'] }),
  ex({ id: 'leg_press', name: 'Leg press', pattern: 'squat', kind: 'compound', load: 'machine', needs: 'gym', body: 'lower', level: 'beginner', muscles: 'Quads, glutes', cues: ['Feet mid-platform, shoulder-width', 'Lower until knees reach about 90°', 'Keep your lower back on the pad'] }),
  ex({ id: 'goblet_squat', name: 'Goblet squat', pattern: 'squat', kind: 'compound', load: 'dumbbell', needs: 'dumbbells', body: 'lower', level: 'beginner', muscles: 'Quads, glutes', cues: ['Hold one dumbbell at your chest', 'Elbows inside the knees at the bottom', 'Stand tall, squeeze glutes at the top'] }),
  ex({ id: 'bodyweight_squat', name: 'Bodyweight squat', pattern: 'squat', kind: 'compound', load: 'bodyweight', needs: 'bodyweight', body: 'lower', level: 'beginner', muscles: 'Quads, glutes', cues: ['Arms forward for balance', 'Sit back and down, heels flat', 'Lower for 3 seconds once it gets easy'] }),

  // ----- Hinge -----
  ex({ id: 'romanian_deadlift', name: 'Romanian deadlift', pattern: 'hinge', kind: 'compound', load: 'barbell', needs: 'gym', body: 'lower', level: 'intermediate', muscles: 'Hamstrings, glutes, back', cues: ['Soft knees, push hips back', 'Bar stays close to your legs', 'Stop when hamstrings are stretched, back flat'] }),
  ex({ id: 'trap_bar_deadlift', name: 'Trap-bar deadlift', pattern: 'hinge', kind: 'compound', load: 'barbell', needs: 'gym', body: 'lower', level: 'beginner', muscles: 'Glutes, hamstrings, quads, back', cues: ['Stand in the centre of the bar', 'Brace, then push the floor away', 'Lock out with glutes, not by leaning back'] }),
  ex({ id: 'db_romanian_deadlift', name: 'Dumbbell Romanian deadlift', pattern: 'hinge', kind: 'compound', load: 'dumbbell', needs: 'dumbbells', body: 'lower', level: 'beginner', muscles: 'Hamstrings, glutes', cues: ['Dumbbells in front of your thighs', 'Hips back, back flat', 'Stand up by squeezing your glutes'] }),
  ex({ id: 'glute_bridge', name: 'Glute bridge', pattern: 'hinge', kind: 'compound', load: 'bodyweight', needs: 'bodyweight', body: 'lower', level: 'beginner', muscles: 'Glutes, hamstrings', cues: ['Lie on your back, feet flat near hips', 'Push through heels to lift hips', 'Hold 1 second at the top'] }),
  ex({ id: 'single_leg_bridge', name: 'Single-leg glute bridge', pattern: 'hinge', kind: 'compound', load: 'bodyweight', needs: 'bodyweight', body: 'lower', level: 'intermediate', muscles: 'Glutes, hamstrings', cues: ['One foot on the floor, other leg straight', 'Keep hips level as you lift', 'Reps count per leg'] }),

  // ----- Lunge -----
  ex({ id: 'walking_lunge', name: 'Dumbbell walking lunge', pattern: 'lunge', kind: 'compound', load: 'dumbbell', needs: 'dumbbells', body: 'lower', level: 'beginner', muscles: 'Quads, glutes', cues: ['Long step, back knee towards the floor', 'Front knee follows your toes', 'Reps count per leg'] }),
  ex({ id: 'bulgarian_split_squat', name: 'Bulgarian split squat', pattern: 'lunge', kind: 'compound', load: 'dumbbell', needs: 'dumbbells', body: 'lower', level: 'intermediate', muscles: 'Quads, glutes', cues: ['Back foot on a bench', 'Drop straight down', 'Reps count per leg'] }),
  ex({ id: 'reverse_lunge', name: 'Reverse lunge', pattern: 'lunge', kind: 'compound', load: 'bodyweight', needs: 'bodyweight', body: 'lower', level: 'beginner', muscles: 'Quads, glutes', cues: ['Step back, lower the back knee', 'Push through the front heel to return', 'Reps count per leg'] }),
  ex({ id: 'step_up', name: 'Step-up', pattern: 'lunge', kind: 'compound', load: 'bodyweight', needs: 'bodyweight', body: 'lower', level: 'beginner', muscles: 'Quads, glutes', cues: ['Use a sturdy step or bench at knee height', 'Push through the top foot only', 'Reps count per leg'] }),

  // ----- Horizontal push -----
  ex({ id: 'bench_press', name: 'Barbell bench press', pattern: 'h_push', kind: 'compound', load: 'barbell', needs: 'gym', body: 'upper', level: 'intermediate', muscles: 'Chest, shoulders, triceps', cues: ['Shoulder blades pinched, feet planted', 'Lower to mid-chest', 'Use a spotter or safety bars'] }),
  ex({ id: 'machine_chest_press', name: 'Machine chest press', pattern: 'h_push', kind: 'compound', load: 'machine', needs: 'gym', body: 'upper', level: 'beginner', muscles: 'Chest, shoulders, triceps', cues: ['Handles at mid-chest height', 'Press without locking elbows hard', 'Control the return'] }),
  ex({ id: 'db_bench_press', name: 'Dumbbell bench press', pattern: 'h_push', kind: 'compound', load: 'dumbbell', needs: 'dumbbells', body: 'upper', level: 'beginner', muscles: 'Chest, shoulders, triceps', cues: ['Use a bench or the floor', 'Elbows about 45° from your body', 'Press up and slightly together'] }),
  ex({ id: 'incline_db_press', name: 'Incline dumbbell press', pattern: 'h_push', kind: 'compound', load: 'dumbbell', needs: 'dumbbells', body: 'upper', level: 'beginner', muscles: 'Upper chest, shoulders', cues: ['Bench at 30°', 'Lower to upper chest', 'Keep wrists stacked over elbows'] }),
  ex({ id: 'push_up', name: 'Push-up', pattern: 'h_push', kind: 'compound', load: 'bodyweight', needs: 'bodyweight', body: 'upper', level: 'beginner', muscles: 'Chest, shoulders, triceps', cues: ['Body in a straight line', 'Chest to just above the floor', 'Hands on a bench or wall if needed'] }),

  // ----- Vertical push -----
  ex({ id: 'overhead_press', name: 'Standing overhead press', pattern: 'v_push', kind: 'compound', load: 'barbell', needs: 'gym', body: 'upper', level: 'intermediate', muscles: 'Shoulders, triceps', cues: ['Squeeze glutes, ribs down', 'Press up and slightly back', 'Head through at the top'] }),
  ex({ id: 'db_shoulder_press', name: 'Seated dumbbell shoulder press', pattern: 'v_push', kind: 'compound', load: 'dumbbell', needs: 'dumbbells', body: 'upper', level: 'beginner', muscles: 'Shoulders, triceps', cues: ['Back against the bench', 'Start at ear height', 'Press up without arching your back'] }),
  ex({ id: 'pike_push_up', name: 'Pike push-up', pattern: 'v_push', kind: 'compound', load: 'bodyweight', needs: 'bodyweight', body: 'upper', level: 'beginner', muscles: 'Shoulders, triceps', cues: ['Hips high, body in an upside-down V', 'Lower your head towards your hands', 'Feet on a step makes it harder'] }),

  // ----- Horizontal pull -----
  ex({ id: 'seated_cable_row', name: 'Seated cable row', pattern: 'h_pull', kind: 'compound', load: 'cable', needs: 'gym', body: 'upper', level: 'beginner', muscles: 'Upper back, lats, biceps', cues: ['Sit tall, slight knee bend', 'Pull to your belly button', 'Squeeze shoulder blades together'] }),
  ex({ id: 'barbell_row', name: 'Barbell row', pattern: 'h_pull', kind: 'compound', load: 'barbell', needs: 'gym', body: 'upper', level: 'intermediate', muscles: 'Upper back, lats, biceps', cues: ['Hinge to about 45°, back flat', 'Pull the bar to your lower ribs', 'No jerking with the hips'] }),
  ex({ id: 'one_arm_db_row', name: 'One-arm dumbbell row', pattern: 'h_pull', kind: 'compound', load: 'dumbbell', needs: 'dumbbells', body: 'upper', level: 'beginner', muscles: 'Lats, upper back, biceps', cues: ['Hand and knee on a bench', 'Pull the dumbbell to your hip', 'Reps count per arm'] }),
  ex({ id: 'inverted_row', name: 'Table or inverted row', pattern: 'h_pull', kind: 'compound', load: 'bodyweight', needs: 'bodyweight', body: 'upper', level: 'beginner', muscles: 'Upper back, biceps', cues: ['Lie under a sturdy table or low bar', 'Pull your chest to the edge', 'Bend knees to make it easier'] }),
  ex({ id: 'backpack_row', name: 'Backpack bent-over row', pattern: 'h_pull', kind: 'compound', load: 'bodyweight', needs: 'bodyweight', body: 'upper', level: 'beginner', muscles: 'Upper back, biceps', cues: ['Fill a backpack with books', 'Hinge forward, back flat', 'Pull it to your belly'] }),

  // ----- Vertical pull -----
  ex({ id: 'lat_pulldown', name: 'Lat pulldown', pattern: 'v_pull', kind: 'compound', load: 'cable', needs: 'gym', body: 'upper', level: 'beginner', muscles: 'Lats, biceps', cues: ['Hands a little wider than shoulders', 'Pull the bar to your upper chest', 'Lean back only slightly'] }),
  ex({ id: 'pull_up', name: 'Pull-up (assisted if needed)', pattern: 'v_pull', kind: 'compound', load: 'bodyweight', needs: 'gym', body: 'upper', level: 'intermediate', muscles: 'Lats, biceps', cues: ['Start from a dead hang', 'Chin over the bar', 'Use a band or assist machine to reach the reps'] }),
  ex({ id: 'db_pullover', name: 'Dumbbell pullover', pattern: 'v_pull', kind: 'isolation', load: 'dumbbell', needs: 'dumbbells', body: 'upper', level: 'beginner', muscles: 'Lats, chest', cues: ['Lie across a bench, one dumbbell overhead', 'Lower behind your head with soft elbows', 'Pull back over your chest'] }),
  ex({ id: 'superman_pull', name: 'Superman pull', pattern: 'v_pull', kind: 'isolation', load: 'bodyweight', needs: 'bodyweight', body: 'upper', level: 'beginner', muscles: 'Lats, upper back', cues: ['Lie face down, arms overhead', 'Lift chest and pull elbows to your sides', 'Hold 2 seconds each rep'] }),

  // ----- Shoulders -----
  ex({ id: 'lateral_raise', name: 'Dumbbell lateral raise', pattern: 'shoulders', kind: 'isolation', load: 'dumbbell', needs: 'dumbbells', body: 'upper', level: 'beginner', muscles: 'Side shoulders', cues: ['Slight bend in the elbows', 'Raise to shoulder height', 'Lower slowly'] }),
  ex({ id: 'face_pull', name: 'Cable face pull', pattern: 'shoulders', kind: 'isolation', load: 'cable', needs: 'gym', body: 'upper', level: 'beginner', muscles: 'Rear shoulders, upper back', cues: ['Rope at face height', 'Pull towards your eyes, elbows high', 'Squeeze for 1 second'] }),
  ex({ id: 'rear_delt_fly', name: 'Bent-over rear-delt fly', pattern: 'shoulders', kind: 'isolation', load: 'dumbbell', needs: 'dumbbells', body: 'upper', level: 'beginner', muscles: 'Rear shoulders', cues: ['Hinge forward, chest down', 'Open arms wide, thumbs forward', 'Light weight, slow tempo'] }),
  ex({ id: 'ytw_raise', name: 'Y-T-W raise', pattern: 'shoulders', kind: 'isolation', load: 'bodyweight', needs: 'bodyweight', body: 'upper', level: 'beginner', muscles: 'Rear shoulders, upper back', cues: ['Lie face down or hinge forward', 'Raise arms in a Y, then T, then W', 'One round of all three is one rep'] }),

  // ----- Biceps -----
  ex({ id: 'db_curl', name: 'Dumbbell curl', pattern: 'biceps', kind: 'isolation', load: 'dumbbell', needs: 'dumbbells', body: 'upper', level: 'beginner', muscles: 'Biceps', cues: ['Elbows pinned to your sides', 'Curl up, turn the palm up', 'Lower for 2 seconds'] }),
  ex({ id: 'cable_curl', name: 'Cable curl', pattern: 'biceps', kind: 'isolation', load: 'cable', needs: 'gym', body: 'upper', level: 'beginner', muscles: 'Biceps', cues: ['Stand tall, elbows still', 'Squeeze at the top', 'Control the way down'] }),
  ex({ id: 'hammer_curl', name: 'Hammer curl', pattern: 'biceps', kind: 'isolation', load: 'dumbbell', needs: 'dumbbells', body: 'upper', level: 'beginner', muscles: 'Biceps, forearms', cues: ['Palms facing each other', 'Elbows still', 'No swinging'] }),
  ex({ id: 'backpack_curl', name: 'Backpack curl', pattern: 'biceps', kind: 'isolation', load: 'bodyweight', needs: 'bodyweight', body: 'upper', level: 'beginner', muscles: 'Biceps', cues: ['Hold a loaded backpack by the top handle or straps', 'Elbows at your sides', 'Lower slowly'] }),

  // ----- Triceps -----
  ex({ id: 'triceps_pushdown', name: 'Cable triceps pushdown', pattern: 'triceps', kind: 'isolation', load: 'cable', needs: 'gym', body: 'upper', level: 'beginner', muscles: 'Triceps', cues: ['Elbows by your sides', 'Push down until arms are straight', 'Only the forearms move'] }),
  ex({ id: 'overhead_db_extension', name: 'Overhead dumbbell extension', pattern: 'triceps', kind: 'isolation', load: 'dumbbell', needs: 'dumbbells', body: 'upper', level: 'beginner', muscles: 'Triceps', cues: ['One dumbbell held with both hands overhead', 'Lower behind your head', 'Elbows point forward'] }),
  ex({ id: 'bench_dip', name: 'Bench dip', pattern: 'triceps', kind: 'isolation', load: 'bodyweight', needs: 'bodyweight', body: 'upper', level: 'beginner', muscles: 'Triceps', cues: ['Hands on a chair or bench behind you', 'Lower until elbows reach 90°', 'Bend knees to make it easier'] }),
  ex({ id: 'close_grip_push_up', name: 'Close-grip push-up', pattern: 'triceps', kind: 'compound', load: 'bodyweight', needs: 'bodyweight', body: 'upper', level: 'beginner', muscles: 'Triceps, chest', cues: ['Hands under your shoulders', 'Elbows brush your ribs', 'Knees down if needed'] }),

  // ----- Calves -----
  ex({ id: 'standing_calf_raise', name: 'Standing calf raise', pattern: 'calves', kind: 'isolation', load: 'machine', needs: 'gym', body: 'lower', level: 'beginner', muscles: 'Calves', cues: ['Full stretch at the bottom', 'Rise high onto your toes', 'Pause 1 second at the top'] }),
  ex({ id: 'single_leg_calf_raise', name: 'Single-leg calf raise', pattern: 'calves', kind: 'isolation', load: 'bodyweight', needs: 'bodyweight', body: 'lower', level: 'beginner', muscles: 'Calves', cues: ['On a step, hold a wall for balance', 'Heel below the step, then rise high', 'Hold a dumbbell to add weight; reps per leg'] }),

  // ----- Core -----
  ex({ id: 'plank', name: 'Plank', pattern: 'core', kind: 'isolation', load: 'bodyweight', needs: 'bodyweight', body: 'core', level: 'beginner', muscles: 'Abs, deep core', cues: ['Forearms down, body straight', 'Squeeze glutes, ribs down', 'Breathe normally'], timed: true }),
  ex({ id: 'dead_bug', name: 'Dead bug', pattern: 'core', kind: 'isolation', load: 'bodyweight', needs: 'bodyweight', body: 'core', level: 'beginner', muscles: 'Abs, deep core', cues: ['Lower back pressed to the floor', 'Lower opposite arm and leg slowly', 'Reps count per side'] }),
  ex({ id: 'cable_crunch', name: 'Cable crunch', pattern: 'core', kind: 'isolation', load: 'cable', needs: 'gym', body: 'core', level: 'beginner', muscles: 'Abs', cues: ['Kneel, rope by your head', 'Curl your ribs towards your hips', 'Hips stay still'] }),
  ex({ id: 'side_plank', name: 'Side plank', pattern: 'core', kind: 'isolation', load: 'bodyweight', needs: 'bodyweight', body: 'core', level: 'beginner', muscles: 'Obliques', cues: ['Elbow under shoulder', 'Hips high, body straight', 'Time counts per side'], timed: true }),
  ex({ id: 'hanging_knee_raise', name: 'Hanging knee raise', pattern: 'core', kind: 'isolation', load: 'bodyweight', needs: 'gym', body: 'core', level: 'intermediate', muscles: 'Abs, hip flexors', cues: ['Hang from a bar, no swinging', 'Bring knees up to chest', 'Lower slowly'] }),

  // ----- Conditioning -----
  ex({ id: 'bike_intervals', name: 'Bike or rower intervals', pattern: 'conditioning', kind: 'compound', load: 'machine', needs: 'gym', body: 'lower', level: 'beginner', muscles: 'Heart and lungs', cues: ['30 seconds hard, 90 seconds easy', 'Hard means you can say only a few words', 'Stop if you feel dizzy or chest pain'], timed: true }),
  ex({ id: 'brisk_circuit', name: 'Brisk walk or step circuit', pattern: 'conditioning', kind: 'compound', load: 'bodyweight', needs: 'bodyweight', body: 'lower', level: 'beginner', muscles: 'Heart and lungs', cues: ['Brisk walk, stairs or step-ups', 'Breathing hard but able to talk', 'Stop if you feel dizzy or chest pain'], timed: true }),
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function exerciseById(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

/**
 * Preferred order of exercises for each pattern. The first one the user can
 * do is the main choice; the next one is used on the "B" version of a day.
 */
export const PREFERENCE: Record<Pattern, string[]> = {
  squat: ['back_squat', 'leg_press', 'goblet_squat', 'bodyweight_squat'],
  hinge: ['romanian_deadlift', 'trap_bar_deadlift', 'db_romanian_deadlift', 'glute_bridge', 'single_leg_bridge'],
  lunge: ['bulgarian_split_squat', 'walking_lunge', 'reverse_lunge', 'step_up'],
  h_push: ['bench_press', 'db_bench_press', 'machine_chest_press', 'incline_db_press', 'push_up'],
  v_push: ['overhead_press', 'db_shoulder_press', 'pike_push_up'],
  h_pull: ['barbell_row', 'seated_cable_row', 'one_arm_db_row', 'inverted_row', 'backpack_row'],
  v_pull: ['pull_up', 'lat_pulldown', 'db_pullover', 'superman_pull'],
  shoulders: ['lateral_raise', 'face_pull', 'rear_delt_fly', 'ytw_raise'],
  biceps: ['db_curl', 'cable_curl', 'hammer_curl', 'backpack_curl'],
  triceps: ['triceps_pushdown', 'overhead_db_extension', 'close_grip_push_up', 'bench_dip'],
  calves: ['standing_calf_raise', 'single_leg_calf_raise'],
  core: ['cable_crunch', 'hanging_knee_raise', 'dead_bug', 'plank', 'side_plank'],
  conditioning: ['bike_intervals', 'brisk_circuit'],
};
