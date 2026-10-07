import { onNativeMessage, postToNative } from '@ap/shell-sdk';

import type { NativeToWebMessage, WebToNativeMessage } from '@/features/auth/types';

export function requestNativeSignOut(): void {
  const message: WebToNativeMessage = { type: 'auth/sign-out' };
  postToNative(message);
}

const REFRESH_TIMEOUT_MS = 15_000;

export function refreshNativeToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onNativeMessage<NativeToWebMessage>((message) => {
      if (message.type !== 'auth/token') return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(message.payload.accessToken);
    });

    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Native token refresh timed out'));
    }, REFRESH_TIMEOUT_MS);

    const request: WebToNativeMessage = { type: 'auth/refresh-request' };
    postToNative(request);
  });
}
