import type { PageReloadState } from './reload-decision';

/** A launch that lasted this long without the bundle crashing counts, if the page loaded too. */
export const LAUNCH_SETTLE_MS = 10_000;
/** A WebView whose page has not started by now counts as a failed launch. */
export const PAGE_START_LIMIT_MS = 30_000;

export interface LaunchProgress {
  elapsedMs: number;
  page: PageReloadState;
  /** The page's own code ran and said so (`page/started`). */
  pageLoaded: boolean;
}

/**
 * Whether this launch worked, or null while it is too early to say. Without a WebView, as on the
 * sign-in screen, staying up is all there is to judge.
 */
export function launchOutcome({ elapsedMs, page, pageLoaded }: LaunchProgress): boolean | null {
  if (elapsedMs < LAUNCH_SETTLE_MS) return null;
  if (page === 'none' || pageLoaded) return true;
  return elapsedMs >= PAGE_START_LIMIT_MS ? false : null;
}
