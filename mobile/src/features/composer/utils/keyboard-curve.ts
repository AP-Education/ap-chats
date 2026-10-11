export type KeyboardDirection = 'up' | 'down';

/** A keyboard height and when it was reported, in ms. */
export interface KeyboardFrame {
  height: number;
  time: number;
}

/** How a move of the space under the page plays out, for the page to follow on its side. */
export interface InsetMotion {
  duration: number;
  easing: string;
}

/** Until a keyboard has been watched moving that way once: close to the iOS keyboard's spring. */
export const DEFAULT_EASING = 'cubic-bezier(0.38, 0.7, 0.125, 1)';

/** Only a keyboard rising from nothing or falling to nothing teaches the curve. */
export function keyboardDirection(from: number, to: number): KeyboardDirection | null {
  'worklet';
  if (from === 0 && to > 0) return 'up';
  if (from > 0 && to === 0) return 'down';
  return null;
}

/**
 * The keyboard's own motion from `from` to `to`, measured from its frames: each lands at the moment
 * it was reported, and the move lasts until the last one, not until the late end event. Null unless
 * the frames describe one steady move.
 */
export function learnedMotion(
  frames: KeyboardFrame[],
  from: number,
  to: number,
  started: number,
): InsetMotion | null {
  const travel = to - from;
  const last = frames.at(-1);
  const duration = last ? last.time - started : 0;
  if (travel === 0 || duration <= 0 || frames.length < 4) return null;

  const points = frames.map(({ height, time }) => ({
    progress: Math.min(1, Math.max(0, (height - from) / travel)),
    at: (time - started) / duration,
  }));
  const steady = points.every(
    (point, index) => index === 0 || point.progress >= points[index - 1]!.progress - 0.02,
  );
  if (!steady) return null;

  const stops = points.map(
    ({ progress, at }) => `${progress.toFixed(3)} ${(at * 100).toFixed(1)}%`,
  );
  return { duration, easing: `linear(0, ${stops.join(', ')}, 1)` };
}
