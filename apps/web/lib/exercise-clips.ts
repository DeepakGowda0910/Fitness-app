/**
 * Looping 3D demonstration clips, one per exercise, stored as small MP4 files
 * (with a WebM copy for browsers without MP4 support) in public/demos/<id>.mp4 with a still poster image in public/demos/<id>.jpg.
 * The clips are rendered from a free (CC0) 3D body model, so they can be used
 * commercially. Worked muscles are shown in red.
 */

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function clipFor(exerciseId: string): { video: string; webm: string; poster: string } {
  const at = `${base}/demos/${exerciseId}`;
  return { video: `${at}.mp4`, webm: `${at}.webm`, poster: `${at}.jpg` };
}

/** Short notes shown under a clip when the equipment needs a word of explanation. */
export const CLIP_NOTES: Readonly<Record<string, string>> = {
  leg_press: 'Shown on a 45° leg press',
  backpack_row: 'A backpack filled with books',
  backpack_curl: 'A loaded backpack held by the handle',
  bike_intervals: 'Shown on a bike; a rower works too',
  brisk_circuit: 'Marching on the spot; stairs or step-ups work too',
  ytw_raise: 'Y, then T, then W',
  dead_bug: 'Opposite arm and leg, then switch',
  walking_lunge: 'Step through, alternating legs',
};
