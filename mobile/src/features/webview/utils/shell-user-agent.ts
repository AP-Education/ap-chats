/**
 * Appended to the WebView's User-Agent so web/ can detect the native shell
 * synchronously via navigator.userAgent — no injected script, no load-order race, and
 * detection still works even if the message bridge itself fails to wire up. Mirrored in
 * web/src/app/auth/nativeBridge.ts; this is the one string both sides must agree on.
 *
 * Same technique Slack/Instagram/WhatsApp use for their embedded WebViews. Bump the
 * version segment on breaking bridge-protocol changes, not on every release.
 */
export const APP_SHELL_USER_AGENT = 'ApAppMobile/1';
