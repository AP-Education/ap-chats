/**
 * What the WebView can say about losing work:
 * - `none`: no page is loaded, so nothing in it can be lost;
 * - `silent`: a page is loaded but has not reported its work, as pages from before
 *   `ApAppReloadGuard/1` never do, so it may be busy;
 * - `reporting`: the page reports what a reload would lose.
 */
export type PageReloadState = 'none' | 'silent' | 'reporting';

export interface ReloadConditions {
  appActive: boolean;
  inCall: boolean;
  /** Signing in or out waits on a browser round trip that a reload would break. */
  authInProgress: boolean;
  page: PageReloadState;
  /** What the page reports a reload would lose: uploads, a recording, a message on its way. */
  pageBusy: boolean;
}

/** Whether replacing the running bundle now would cost the person nothing. */
export function canReloadNow(conditions: ReloadConditions): boolean {
  if (conditions.inCall || conditions.authInProgress || conditions.pageBusy) return false;
  // A page that cannot say is only reloaded where nobody is looking at it.
  if (conditions.page === 'silent') return !conditions.appActive;
  return true;
}
