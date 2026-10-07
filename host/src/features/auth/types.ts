// Bridge protocol: web-side mirror of mobile/src/features/webview/types/index.ts.
// Transport itself (window.ApAppNative/ReactNativeWebView) lives in @ap/shell-sdk native-bridge.
export interface NativeAuthTokenPayload {
  accessToken: string;
  expiresAt: number;
  idToken?: string;
}

export type NativeToWebMessage =
  { type: 'auth/token'; payload: NativeAuthTokenPayload } | { type: 'auth/unavailable' };

export type WebToNativeMessage = { type: 'auth/sign-out' } | { type: 'auth/refresh-request' };
