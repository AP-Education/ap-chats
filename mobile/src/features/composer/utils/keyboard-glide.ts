export type GlideDirection = 'up' | 'down';

/** A keyboard height and when it was reported, in ms. */
export interface KeyboardFrame {
  height: number;
  time: number;
}

/** Until a keyboard has been watched moving that way once: close to the iOS keyboard's spring. */
export const DEFAULT_GLIDE_EASING = 'cubic-bezier(0.38, 0.7, 0.125, 1)';

/** Only the keyboard alone glides, rising from nothing or falling to nothing. */
export function glideDirection(from: number, to: number, alone: boolean): GlideDirection | null {
  'worklet';
  if (!alone) return null;
  if (from === 0 && to > 0) return 'up';
  if (from > 0 && to === 0) return 'down';
  return null;
}

/**
 * The keyboard's own motion from `from` to `to` as a CSS easing. Each frame is placed at the
 * moment it was reported, so dropped frames don't bend the curve. Null unless the frames
 * describe one steady move.
 */
export function glideEasing(
  frames: KeyboardFrame[],
  from: number,
  to: number,
  started: number,
  ended: number,
): string | null {
  const travel = to - from;
  const span = ended - started;
  if (travel === 0 || span <= 0 || frames.length < 4) return null;

  const points = frames.map(({ height, time }) => ({
    progress: Math.min(1, Math.max(0, (height - from) / travel)),
    at: Math.min(1, Math.max(0, (time - started) / span)),
  }));
  const steady = points.every(
    (point, index) => index === 0 || point.progress >= points[index - 1]!.progress - 0.02,
  );
  if (!steady) return null;

  const stops = points.map(
    ({ progress, at }) => `${progress.toFixed(3)} ${(at * 100).toFixed(1)}%`,
  );
  return `linear(0, ${stops.join(', ')}, 1)`;
}
