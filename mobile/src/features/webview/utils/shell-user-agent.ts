/**
 * Appended to the WebView's User-Agent so web/ can detect the native shell
 * synchronously via navigator.userAgent — no injected script, no load-order race, and
 * detection still works even if the message bridge itself fails to wire up. Mirrored in
 * ap-app's shell-sdk (app-shell.ts); this is the one string both sides must agree on.
 *
 * Same technique Slack/Instagram/WhatsApp use for their embedded WebViews.
 */

/**
 * What this shell can do for the page, one `ApApp<Name>/<version>` token each
 * (docs/adr/0008-app-updates.md). The page turns a feature on by its token, never by the
 * shell's release, because an over-the-air update and a store build can arrive in any order.
 *
 * - Bump a version only on a breaking change to that capability's bridge protocol.
 * - Add a token in the same change that ships the capability. A token that needs new native
 *   code must not reach a binary without it: over-the-air updates cannot add native code.
 * - Everything the bridge did before tokens existed is implied by `Mobile/1`.
 */
export const SHELL_CAPABILITIES = {
  Mobile: 1,
  /** This shell draws the tab bar, so the page hides its own. */
  TabBar: 1,
} as const satisfies Record<string, number>;

export function shellUserAgent(capabilities: Record<string, number>): string {
  return Object.entries(capabilities)
    .map(([name, version]) => `ApApp${name}/${version}`)
    .join(' ');
}

export const APP_SHELL_USER_AGENT = shellUserAgent(SHELL_CAPABILITIES);
