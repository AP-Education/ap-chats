import type { PropsWithChildren } from 'react';
import { useAuth } from 'react-oidc-context';

import { getAppShell } from '../../../lib/app-shell';
import { refreshNativeToken, requestNativeSignOut } from '../api/native-bridge';
import { oidcConfigured } from '../api/oidc-config';
import { useNativeAuthBridge } from '../hooks/useNativeAuthBridge';
import { CurrentUserContext } from '../stores/current-user-context';
import type { CurrentUserProfile, CurrentUserState } from '../types';
import { OidcProvider } from './OidcProvider';

// The one place that decides where "who's signed in" comes from — OIDC or native bridge.
export function CurrentUserProvider({ children }: PropsWithChildren) {
  const shell = getAppShell();

  if (shell.kind !== 'browser') {
    return <NativeCurrentUserProvider>{children}</NativeCurrentUserProvider>;
  }

  if (!oidcConfigured) {
    return (
      <CurrentUserContext.Provider value={{ status: 'unavailable' }}>
        {children}
      </CurrentUserContext.Provider>
    );
  }

  return (
    <OidcProvider>
      <OidcCurrentUserProvider>{children}</OidcCurrentUserProvider>
    </OidcProvider>
  );
}

function NativeCurrentUserProvider({ children }: PropsWithChildren) {
  const native = useNativeAuthBridge();

  const state: CurrentUserState =
    native.status === 'signed-in'
      ? {
          status: 'signed-in',
          accessToken: native.accessToken,
          profile: native.profile,
          signOut: requestNativeSignOut,
          refreshAccessToken: refreshNativeToken,
        }
      : native.status === 'unavailable'
        ? { status: 'unavailable' }
        : { status: 'loading' };

  return <CurrentUserContext.Provider value={state}>{children}</CurrentUserContext.Provider>;
}

function OidcCurrentUserProvider({ children }: PropsWithChildren) {
  const auth = useAuth();

  const state: CurrentUserState = auth.isLoading
    ? { status: 'loading' }
    : auth.isAuthenticated && auth.user && !auth.user.expired
      ? {
          status: 'signed-in',
          accessToken: auth.user.access_token,
          profile: toProfile(auth.user.profile),
          signOut: () =>
            void auth.signoutRedirect({
              id_token_hint: auth.user?.id_token,
              post_logout_redirect_uri: window.location.origin,
            }),
        }
      : {
          status: 'signed-out',
          retry: Boolean(auth.error),
          // window.location, not useLocation() — this provider sits above the router.
          signIn: () =>
            void auth.signinRedirect({
              state: { returnTo: window.location.pathname + window.location.search },
            }),
        };

  return <CurrentUserContext.Provider value={state}>{children}</CurrentUserContext.Provider>;
}

function toProfile(profile: { name?: unknown; picture?: unknown }): CurrentUserProfile {
  return {
    name: typeof profile.name === 'string' ? profile.name : undefined,
    picture: typeof profile.picture === 'string' && profile.picture ? profile.picture : undefined,
  };
}
