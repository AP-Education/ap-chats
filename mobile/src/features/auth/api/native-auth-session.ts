import * as AuthSession from 'expo-auth-session';

import type { AuthSessionProvider, TokenSet } from '../types';
import type { OidcConfig } from './config';

/**
 * expo-auth-session adapter: system browser + PKCE, same issuer/audience as web
 * (see README "Спільний вхід") but its own native client_id and redirect scheme.
 */
export class NativeAuthSession implements AuthSessionProvider {
  constructor(private readonly config: OidcConfig) {}

  async signIn(): Promise<TokenSet> {
    const discovery = await AuthSession.fetchDiscoveryAsync(this.config.issuer);

    const request = new AuthSession.AuthRequest({
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ['openid', 'profile'],
      usePKCE: true,
      extraParams: { resource: this.config.audience },
    });

    const result = await request.promptAsync(discovery);
    if (result.type !== 'success') {
      throw new Error(`Sign-in ${result.type}`);
    }

    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId: this.config.clientId,
        code: result.params.code,
        redirectUri: this.config.redirectUri,
        extraParams: { code_verifier: request.codeVerifier ?? '' },
      },
      discovery,
    );

    return toTokenSet(tokenResponse);
  }

  async refresh(tokens: TokenSet): Promise<TokenSet> {
    if (!tokens.refreshToken) {
      throw new Error('No refresh token available');
    }
    const discovery = await AuthSession.fetchDiscoveryAsync(this.config.issuer);
    const tokenResponse = await AuthSession.refreshAsync(
      { clientId: this.config.clientId, refreshToken: tokens.refreshToken },
      discovery,
    );
    return toTokenSet(tokenResponse, {
      refreshToken: tokens.refreshToken,
      idToken: tokens.idToken,
    });
  }

  // Clears the local session only. Accounts-side logout is a follow-up (see README "Спільний вхід").
  async signOut(): Promise<void> {}
}

function toTokenSet(
  response: AuthSession.TokenResponse,
  fallback?: Pick<TokenSet, 'refreshToken' | 'idToken'>,
): TokenSet {
  if (!response.accessToken) {
    throw new Error('Token response missing access_token');
  }
  const issuedAt = response.issuedAt ?? Math.floor(Date.now() / 1000);
  const expiresIn = response.expiresIn ?? 300;
  return {
    accessToken: response.accessToken,
    expiresAt: (issuedAt + expiresIn) * 1000,
    refreshToken: response.refreshToken ?? fallback?.refreshToken,
    idToken: response.idToken ?? fallback?.idToken,
  };
}
