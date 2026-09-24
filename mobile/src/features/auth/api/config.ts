import * as AuthSession from 'expo-auth-session';

export interface OidcConfig {
  issuer: string;
  clientId: string;
  audience: string;
  redirectUri: string;
}

/** Mirrors web/src/app/providers/OidcProvider.tsx: same issuer/audience, separate native client_id. */
export function loadOidcConfig(): OidcConfig | null {
  const issuer = process.env.EXPO_PUBLIC_OIDC_ISSUER?.trim();
  const clientId = process.env.EXPO_PUBLIC_OIDC_CLIENT_ID?.trim();
  const audience = process.env.EXPO_PUBLIC_OIDC_AUDIENCE?.trim();
  if (!issuer || !clientId || !audience) return null;

  return {
    issuer,
    clientId,
    audience,
    redirectUri: AuthSession.makeRedirectUri({ path: 'auth/callback' }),
  };
}
