const issuer = import.meta.env.VITE_OIDC_ISSUER?.trim();
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID?.trim();
const audience = import.meta.env.VITE_OIDC_AUDIENCE?.trim();

export const oidcConfigured = Boolean(issuer && clientId && audience);

export interface OidcConfig {
  issuer: string;
  clientId: string;
  audience: string;
}

/** Only call once oidcConfigured is true — CurrentUserProvider is the one place that guarantees this. */
export function getOidcConfig(): OidcConfig {
  if (!issuer || !clientId || !audience) {
    throw new Error('OIDC is not configured');
  }
  return { issuer, clientId, audience };
}
