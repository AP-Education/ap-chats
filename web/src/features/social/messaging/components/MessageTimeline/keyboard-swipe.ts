export interface SwipePoint {
  x: number;
  y: number;
  time: number;
}

/** A finger on the history: where it went down and its last moments, to read how it let go. */
export interface KeyboardSwipe {
  start: SwipePoint;
  recent: SwipePoint[];
}

// Roughly the travel from mid-history down to the keyboard's edge, as Telegram reads a pull.
const PULL_DISTANCE = 120;
const FLICK_DISTANCE = 48;
const FLICK_SPEED = 0.8;
const SPEED_WINDOW_MS = 100;

export function startSwipe(point: SwipePoint): KeyboardSwipe {
  return { start: point, recent: [point] };
}

export function moveSwipe(swipe: KeyboardSwipe, point: SwipePoint): KeyboardSwipe {
  const recent = [...swipe.recent, point].filter(
    (sample) => point.time - sample.time <= SPEED_WINDOW_MS,
  );
  return { start: swipe.start, recent };
}

/** A long pull down closes the keyboard while the finger is still moving. */
export function closesWhileDragging(swipe: KeyboardSwipe): boolean {
  return downward(swipe) >= PULL_DISTANCE;
}

/** Let go, a quick flick down closes it too; a short or upward drag only ever scrolls. */
export function closesOnRelease(swipe: KeyboardSwipe): boolean {
  const travel = downward(swipe);
  if (travel >= PULL_DISTANCE) return true;

  return travel >= FLICK_DISTANCE && releaseSpeed(swipe) >= FLICK_SPEED;
}

function downward({ start, recent }: KeyboardSwipe): number {
  const last = recent.at(-1) ?? start;
  const down = last.y - start.y;
  const across = Math.abs(last.x - start.x);

  return down > across ? down : 0;
}

function releaseSpeed({ recent }: KeyboardSwipe): number {
  const first = recent[0];
  const last = recent.at(-1);
  if (!first || !last || last.time <= first.time) return 0;

  return (last.y - first.y) / (last.time - first.time);
}
