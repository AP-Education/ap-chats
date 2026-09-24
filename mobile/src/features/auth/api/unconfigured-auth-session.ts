import type { AuthSessionProvider, TokenSet } from '../types';

/**
 * Null-object adapter used when EXPO_PUBLIC_OIDC_* isn't set (local dev before a native
 * client is registered in Accounts). AuthStore never calls into it — signIn() is
 * guarded by AuthState 'unconfigured' — this only exists so the port stays fully typed.
 */
export class UnconfiguredAuthSession implements AuthSessionProvider {
  signIn(): Promise<TokenSet> {
    return Promise.reject(new Error('OIDC is not configured'));
  }

  refresh(): Promise<TokenSet> {
    return Promise.reject(new Error('OIDC is not configured'));
  }

  signOut(): Promise<void> {
    return Promise.resolve();
  }
}
