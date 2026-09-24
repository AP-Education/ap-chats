import { WebStorageStateStore } from 'oidc-client-ts';
import type { PropsWithChildren } from 'react';
import { AuthProvider } from 'react-oidc-context';

import { getOidcConfig } from '../api/oidc-config';

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

// Only rendered from CurrentUserProvider, which already guarantees OIDC is configured.
export function OidcProvider({ children }: PropsWithChildren) {
  const { issuer, clientId, audience } = getOidcConfig();

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
