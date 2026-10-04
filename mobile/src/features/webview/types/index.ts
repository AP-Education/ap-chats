import type { NativeCallConnectPayload } from '../../calls/types';
import type { ComposerInputRequest, ComposerInputState } from '../../composer';

// Bridge protocol: mirrors web/src/features/auth/types/index.ts. Keep additive.
export interface NativeAuthTokenPayload {
  accessToken: string;
  expiresAt: number;
  /** OIDC id_token, so web/ can show name/picture without a userinfo round trip. */
  idToken?: string;
}

export type NativeToWebMessage =
  | { type: 'auth/token'; payload: NativeAuthTokenPayload }
  /** Native has no OIDC client configured (e.g. local dev) — no token is coming, ever. */
  | { type: 'auth/unavailable' }
  | ({ type: 'composer/state' } & ComposerInputState)
  | { type: 'composer/insert'; sessionId: string; requestId: number; text: string }
  | { type: 'composer/gif'; sessionId: string; requestId: number; url: string; title: string };

export type WebToNativeMessage =
  | { type: 'auth/sign-out' }
  | { type: 'auth/refresh-request' }
  | { type: 'calls/connect'; payload: NativeCallConnectPayload }
  | { type: 'haptics/selection' }
  | { type: 'notifications/message-sound' }
  /** __DEV__ only — see debug-console.ts. Lets web/'s own console show up in the
   * RN console, since the WebView runs in a separate JS context Metro can't see. */
  | { type: 'debug/console'; level: 'log' | 'warn' | 'error'; args: string[] }
  | { type: 'debug/error'; message: string }
  | ComposerInputRequest;
