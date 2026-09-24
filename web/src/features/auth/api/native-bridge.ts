import type { WebToNativeMessage } from '../types';

export function requestNativeSignOut(): void {
  const message: WebToNativeMessage = { type: 'auth/sign-out' };
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}
