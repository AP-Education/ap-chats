// Generic native<->web transport for the mobile WebView shell. Carries no business
// shapes of its own — every feature (auth, calls, the composer's keyboard sync) owns
// and casts its own message union, the way mobile/src/features/webview/types/index.ts
// does on the native side. Centralized here because `window.ApAppNative.onMessage` can
// only ever point at one function, so anything beyond a single consumer (auth) needs a
// shared fan-out instead of each feature overwriting the others' listener.
const listeners = new Set<(message: unknown) => void>();

function dispatch(message: unknown) {
  listeners.forEach((listener) => listener(message));
}

/** True only inside the native WebView shell — `window.ReactNativeWebView` is injected
 * by react-native-webview itself, so unlike `ApAppNative` it's a safe synchronous check
 * that doesn't depend on either side having touched the bridge yet. */
export function isNativeShell(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ReactNativeWebView);
}

/** Subscribes to native->web messages, draining anything native sent before this ran.
 * Returns an unsubscribe function. Safe to call from any number of features at once. */
export function onNativeMessage<TMessage>(handler: (message: TMessage) => void): () => void {
  const bridge = (window.ApAppNative ??= {});
  bridge.onMessage ??= dispatch;

  listeners.add(handler as (message: unknown) => void);
  const queued = bridge.queue ?? [];
  bridge.queue = [];
  queued.forEach((message) => handler(message as TMessage));

  return () => listeners.delete(handler as (message: unknown) => void);
}

export function postToNative(message: unknown): void {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}
