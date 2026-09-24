import type { WebToNativeMessage } from '../types';

export function requestNativeSignOut(): void {
  const message: WebToNativeMessage = { type: 'auth/sign-out' };
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

const REFRESH_TIMEOUT_MS = 15_000;

// Chains onto whatever onMessage handler is already registered (useNativeAuthBridge's)
// instead of replacing it, so its own state updates still happen.
export function refreshNativeToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const bridge = (window.ApAppNative ??= {});
    const previousHandler = bridge.onMessage;

    const timeout = setTimeout(() => {
      bridge.onMessage = previousHandler;
      reject(new Error('Native token refresh timed out'));
    }, REFRESH_TIMEOUT_MS);

    bridge.onMessage = (message) => {
      previousHandler?.(message);
      if (message.type === 'auth/token') {
        clearTimeout(timeout);
        bridge.onMessage = previousHandler;
        resolve(message.payload.accessToken);
      }
    };

    const request: WebToNativeMessage = { type: 'auth/refresh-request' };
    window.ReactNativeWebView?.postMessage(JSON.stringify(request));
  });
}
