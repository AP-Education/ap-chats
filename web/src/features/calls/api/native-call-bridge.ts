import { postToNative } from '@ap/shell-sdk';

import { resolveImageUrl } from '@/shared/lib/resolve-image-url';

import type { NativeCallConnectPayload } from '../types';

type WebToNativeCallMessage = { type: 'calls/connect'; payload: NativeCallConnectPayload };

/** Hands a just-started or just-joined call off to the native mobile shell —
 * see NativeCallConnectPayload for why. No-ops outside the native shell. */
export function requestNativeCallConnect(payload: NativeCallConnectPayload): void {
  const message: WebToNativeCallMessage = {
    type: 'calls/connect',
    payload: { ...payload, calleeAvatarPath: resolveImageUrl(payload.calleeAvatarPath) },
  };
  postToNative(message);
}
