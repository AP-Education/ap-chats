/** How far the list must be pulled, after resistance, for letting go to refresh it. */
export const PULL_TRIGGER = 72;
/** Where the list rests while it refreshes, with the spinner in the room above it. */
export const PULL_HOLD = 56;
/** No pull, however long, takes the list further than this. */
const PULL_LIMIT = 132;
/** Movement before the gesture commits to an axis, so a tap or a sideways swipe never pulls. */
export const PULL_SLOP = 8;

/** The list's offset for a finger moved `distance` down: freely at first, then harder and harder. */
export function pullOffset(distance: number): number {
  if (distance <= 0) return 0;
  return (PULL_LIMIT * distance) / (distance + PULL_LIMIT);
}

export type PullIntent = 'undecided' | 'pull' | 'ignore';

/** What a move from the touch's start means: a pull down, or anything else the page handles. */
export function pullIntent(dx: number, dy: number): PullIntent {
  if (Math.abs(dx) < PULL_SLOP && Math.abs(dy) < PULL_SLOP) return 'undecided';
  return dy > 0 && dy > Math.abs(dx) ? 'pull' : 'ignore';
}
