/** Where the page sits against the bottom of the screen the keyboard and the panel rise from. */
export interface PageBottom {
  /** How far above that bottom the page ends: a tab's host can stop short of it. */
  gap: number;
  /** The system bar's room under the page, which it keeps clear of by `--app-inset-bottom`. */
  safeArea: number;
}

/**
 * What the native input covers of the page, beyond what the page keeps clear of itself: the page
 * pads its content by this much and no more.
 */
export function pageKeyboardInset(room: number, { gap, safeArea }: PageBottom): number {
  return Math.max(0, room - gap - safeArea);
}

/**
 * The page's bottom as measured. It runs down under the home indicator or the navigation bar, and
 * keeps clear of only the part of that bar it overlaps.
 */
export function pageBottom(gap: number, systemBar: number): PageBottom {
  return { gap, safeArea: Math.max(0, systemBar - gap) };
}

/**
 * Writes the page's bottom inset into its CSS as `--app-inset-bottom` (the shell's stylesheet reads
 * it): state rather than a message, so it holds from the first paint, whoever listens and when.
 */
export function insetBottomScript(bottom: number): string {
  return `document.documentElement.style.setProperty('--app-inset-bottom', '${bottom}px');\ntrue;\n`;
}
