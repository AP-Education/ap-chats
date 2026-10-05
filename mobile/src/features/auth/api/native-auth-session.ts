import * as AuthSession from 'expo-auth-session';
import { randomUUID } from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

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

  async signOut(idToken?: string): Promise<void> {
    const discovery = await AuthSession.fetchDiscoveryAsync(this.config.issuer);
    if (!discovery.endSessionEndpoint) {
      throw new Error('Accounts discovery is missing end_session_endpoint');
    }

    const state = randomUUID();
    const url = new URL(discovery.endSessionEndpoint);
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('post_logout_redirect_uri', this.config.redirectUri);
    url.searchParams.set('state', state);
    if (idToken) url.searchParams.set('id_token_hint', idToken);

    // Use the same shared system-browser session as signIn(). An HTTP request or
    // an ephemeral browser cannot clear the Accounts cookies used by that session.
    const result = await WebBrowser.openAuthSessionAsync(url.toString(), this.config.redirectUri);
    if (result.type !== 'success') throw new Error(`Sign-out ${result.type}`);

    const callback = new URL(result.url);
    const redirect = new URL(this.config.redirectUri);
    if (
      callback.protocol !== redirect.protocol ||
      callback.host !== redirect.host ||
      callback.pathname !== redirect.pathname ||
      [...redirect.searchParams].some(([key, value]) => callback.searchParams.get(key) !== value) ||
      callback.searchParams.get('state') !== state
    ) {
      throw new Error('Invalid sign-out callback');
    }
    if (callback.searchParams.has('error')) throw new Error('Accounts could not complete sign-out');
  }
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
