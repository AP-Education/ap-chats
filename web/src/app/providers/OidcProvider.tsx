import { WebStorageStateStore } from 'oidc-client-ts';
import type { PropsWithChildren } from 'react';
import { AuthProvider } from 'react-oidc-context';

const issuer = import.meta.env.VITE_OIDC_ISSUER?.trim();
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID?.trim();
const audience = import.meta.env.VITE_OIDC_AUDIENCE?.trim();

export const oidcConfigured = Boolean(issuer && clientId && audience);

function safeReturnTo(state: unknown): string {
  const value =
    state && typeof state === 'object' && 'returnTo' in state ? state.returnTo : undefined;
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !value.startsWith('/auth/callback')
    ? value
    : '/';
}

export function OidcProvider({ children }: PropsWithChildren) {
  if (!issuer || !clientId || !audience) return children;

  return (
    <AuthProvider
      authority={issuer}
      client_id={clientId}
      redirect_uri={`${window.location.origin}/auth/callback`}
      response_type="code"
      scope="openid profile"
      resource={audience}
      loadUserInfo={false}
      automaticSilentRenew={false}
      userStore={new WebStorageStateStore({ store: window.sessionStorage })}
      onSigninCallback={(user) => window.location.replace(safeReturnTo(user?.state))}
    >
      {children}
    </AuthProvider>
  );
}
