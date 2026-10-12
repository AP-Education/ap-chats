/** Where the page sits against the bottom of the screen the keyboard and the panel rise from. */
export interface PageBottom {
  /** How far above that bottom the page ends: a tab's host can stop short of it. */
  gap: number;
  /** The home indicator's room the page keeps clear of on its own (iOS reports it to the page). */
  safeArea: number;
}

/**
 * What the native input covers of the page, beyond what the page keeps clear of itself: the page
 * pads its content by this much and no more.
 */
export function pageKeyboardInset(room: number, { gap, safeArea }: PageBottom): number {
  return Math.max(0, room - gap - safeArea);
}

/** The page's bottom as measured; iOS hands the page only the home indicator room it overlaps. */
export function pageBottom(
  gap: number,
  homeIndicator: number,
  reportsSafeArea: boolean,
): PageBottom {
  return { gap, safeArea: reportsSafeArea ? Math.max(0, homeIndicator - gap) : 0 };
}
