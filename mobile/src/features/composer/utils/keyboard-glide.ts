export type GlideDirection = 'up' | 'down';

/** Until a keyboard has been watched moving that way once: close to the iOS keyboard's spring. */
export const DEFAULT_GLIDE_EASING = 'cubic-bezier(0.38, 0.7, 0.125, 1)';

/**
 * Which way a keyboard move glides, if at all. Only the keyboard alone glides, rising from
 * nothing or falling to nothing; swaps with the picker and height tweaks keep their geometry.
 */
export function glideDirection(from: number, to: number, alone: boolean): GlideDirection | null {
  'worklet';
  if (!alone) return null;
  if (from === 0 && to > 0) return 'up';
  if (from > 0 && to === 0) return 'down';
  return null;
}

/**
 * The keyboard's own motion as a CSS easing, built from the heights it reported frame by frame
 * on its way from `from` to `to`, so the page follows this device and this keyboard rather than
 * a guessed curve. Null when the frames don't describe one steady move.
 */
export function glideEasing(heights: number[], from: number, to: number): string | null {
  const travel = to - from;
  if (travel === 0 || heights.length < 4) return null;

  const progress = heights.map((height) => Math.min(1, Math.max(0, (height - from) / travel)));
  const steady = progress.every(
    (value, index) => index === 0 || value >= progress[index - 1]! - 0.02,
  );
  if (!steady) return null;

  return `linear(0, ${progress.map((value) => value.toFixed(3)).join(', ')}, 1)`;
}
