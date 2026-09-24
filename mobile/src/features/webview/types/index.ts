/**
 * Contract for native <-> web bridge messages. mobile/ and web/ are separate packages
 * with separate releases (see README "Структура"), so this file — and its web-side
 * mirror in web/src/app/auth/nativeBridge.ts — is the one place both sides need to stay
 * in sync on. Keep it additive (new message types, not renamed fields) so an older web
 * build stays compatible with a newer native build and vice versa.
 */
export interface NativeAuthTokenPayload {
  accessToken: string;
  expiresAt: number;
  /** OIDC id_token, so web/ can show name/picture without a userinfo round trip. */
  idToken?: string;
}

export type NativeToWebMessage =
  | { type: 'auth/token'; payload: NativeAuthTokenPayload }
  /** Native has no OIDC client configured (e.g. local dev) — no token is coming, ever. */
  | { type: 'auth/unavailable' };

/** Sent via window.ReactNativeWebView.postMessage from web/src/app/auth/nativeBridge.ts. */
export type WebToNativeMessage = { type: 'auth/sign-out' };
