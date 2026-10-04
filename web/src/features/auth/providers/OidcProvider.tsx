import { WebStorageStateStore } from 'oidc-client-ts';
import type { PropsWithChildren } from 'react';
import { AuthProvider } from 'react-oidc-context';

import { getOidcConfig } from '../api/oidc-config';

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
      automaticSilentRenew
      userStore={new WebStorageStateStore({ store: window.sessionStorage })}
      onSigninCallback={() =>
        window.history.replaceState(window.history.state, '', window.location.pathname)
      }
    >
      {children}
    </AuthProvider>
  );
}
