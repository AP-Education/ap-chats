// Bridge protocol: web-side mirror of mobile/src/features/webview/types/index.ts.
export interface NativeAuthTokenPayload {
  accessToken: string;
  expiresAt: number;
  idToken?: string;
}

export type NativeToWebMessage =
  { type: 'auth/token'; payload: NativeAuthTokenPayload } | { type: 'auth/unavailable' };

export type WebToNativeMessage = { type: 'auth/sign-out' } | { type: 'auth/refresh-request' };

interface NativeBridge {
  onMessage?: (message: NativeToWebMessage) => void;
  queue?: NativeToWebMessage[];
}

declare global {
  interface Window {
    ApAppNative?: NativeBridge;
    ReactNativeWebView?: { postMessage: (data: string) => void };
  }
}

export interface CurrentUserProfile {
  name?: string;
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
