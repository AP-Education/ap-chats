import type { ShellPalette } from '../../appearance';
import type { NativeCallConnectPayload } from '../../calls/types';
import type { ComposerInputRequest, ComposerInputState } from '../../composer';
import type { PushPermission } from '../../push/types';
import type { NotificationIntent } from '../../push/utils/notification-intent';

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
  | { type: 'composer/gif'; sessionId: string; requestId: number; url: string; title: string }
  /** The keyboard starts moving `direction` over the page; it follows by `shift` on `easing`. */
  | {
      type: 'keyboard/glide';
      direction: 'up' | 'down';
      shift: number;
      duration: number;
      easing: string;
    }
  /** The move is over or abandoned; the page settles on its new size. */
  | { type: 'keyboard/glide-end' }
  | { type: 'notifications/open'; payload: NotificationIntent }
  | { type: 'notifications/permission'; status: PushPermission };

export type WebToNativeMessage =
  | { type: 'auth/sign-out' }
  | { type: 'auth/refresh-request' }
  | { type: 'calls/connect'; payload: NativeCallConnectPayload }
  /** The theme the page resolved, for everything native draws around it. */
  | { type: 'appearance/changed'; payload: ShellPalette }
  | { type: 'haptics/selection' }
  | { type: 'notifications/message-sound' }
  /** The page can route a tapped notification now; sent on every mount of its handler. */
  | { type: 'notifications/ready' }
  | { type: 'notifications/ack'; eventId: string }
  /** A conversation was read; its notifications leave the notification center. */
  | { type: 'notifications/dismiss'; collapseKey: string }
  /** The user is reading the WebView, so its own sound replaces the banner. */
  | { type: 'notifications/context'; payload: { attending: boolean } }
  | { type: 'notifications/permission-check' }
  /** The user tapped the notifications control; native asks the OS or opens Settings. */
  | { type: 'notifications/settings' }
  /** __DEV__ only — see debug-console.ts. Lets web/'s own console show up in the
   * RN console, since the WebView runs in a separate JS context Metro can't see. */
  | { type: 'debug/console'; level: 'log' | 'warn' | 'error'; args: string[] }
  | { type: 'debug/error'; message: string }
  | ComposerInputRequest;
