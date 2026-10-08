// Bridge protocol: web-side mirror of mobile/src/features/webview/types/index.ts.
// Transport itself (window.ApAppNative/ReactNativeWebView) lives in shared/lib/nativeBridge.ts.
export interface NativeAuthTokenPayload {
  accessToken: string;
  expiresAt: number;
  idToken?: string;
}

export type NativeToWebMessage =
  { type: 'auth/token'; payload: NativeAuthTokenPayload } | { type: 'auth/unavailable' };

export type WebToNativeMessage =
  { type: 'auth/sign-out' } | { type: 'auth/refresh-request' } | { type: 'haptics/selection' };

export interface CurrentUserProfile {
  name?: string;
  email?: string;
  picture?: string;
  sub?: string;
}

export type CurrentUserState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'signed-out'; retry: boolean; signIn: () => void }
  | {
      status: 'signed-in';
      accessToken: string;
      idToken?: string;
      queryIdentity: string;
      profile?: CurrentUserProfile;
      signOut: () => void;
      refreshAccessToken?: () => Promise<string>;
    };
