import type { NativeToWebMessage } from '../types';

/**
 * Delivers one message via WebView.injectJavaScript. If the page hasn't registered a
 * listener yet, the message is queued so it isn't lost to a race with page load.
 *
 * Detecting "am I inside the native shell" does NOT depend on this object existing —
 * see WebViewHost's applicationNameForUserAgent and web/src/app/auth/nativeBridge.ts.
 * This keeps window.ApAppNative doing one job (carrying messages) instead of also
 * being the presence signal, so a shell that forgets to inject still gets correctly
 * detected by the web side.
 */
export function buildBridgeScript(message: NativeToWebMessage): string {
  return `
    (function () {
      var message = ${JSON.stringify(message)};
      if (window.ApAppNative && typeof window.ApAppNative.onMessage === 'function') {
        window.ApAppNative.onMessage(message);
      } else {
        window.ApAppNative = window.ApAppNative || {};
        window.ApAppNative.queue = window.ApAppNative.queue || [];
        window.ApAppNative.queue.push(message);
      }
    })();
    true;
  `;
}
