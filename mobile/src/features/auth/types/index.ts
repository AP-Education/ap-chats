export interface TokenSet {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
  /** OIDC id_token — decoded client-side by web/ for display (name/picture), never for authorization. */
  idToken?: string;
}

export type AuthState =
  | { status: 'unconfigured' }
  | { status: 'signed-out' }
  | { status: 'signing-in' }
  | { status: 'signing-out' }
  | { status: 'signed-in'; tokens: TokenSet }
  | { status: 'error'; message: string; operation: 'sign-in' | 'sign-out' };

/**
 * Port for the OIDC login/refresh/logout mechanics. The concrete adapter (expo-auth-session
 * today) sits behind this interface so it can be swapped or faked in tests without
 * touching AuthStore or the WebView bridge.
 */
export interface AuthSessionProvider {
  signIn(): Promise<TokenSet>;
  refresh(tokens: TokenSet): Promise<TokenSet>;
  signOut(idToken?: string): Promise<void>;
}

/** Port for persisting tokens across app restarts. */
export interface TokenStore {
  load(): Promise<TokenSet | null>;
  save(tokens: TokenSet): Promise<void>;
  clear(): Promise<void>;
}
