import { CurrentUserContext, type CurrentUserProfile, type CurrentUserState } from '@ap/shell-sdk';
import { type PropsWithChildren, useState } from 'react';
import { useAuth } from 'react-oidc-context';

import { readStoredOidcUser } from '@/features/auth/api/stored-oidc-user';
import { resolveImageUrl } from '@/shared/lib/resolve-image-url';

function toProfile(profile: {
  name?: unknown;
  email?: unknown;
  picture?: unknown;
  sub?: unknown;
}): CurrentUserProfile {
  return {
    name: typeof profile.name === 'string' ? profile.name : undefined,
    email: typeof profile.email === 'string' ? profile.email : undefined,
    picture: typeof profile.picture === 'string' ? resolveImageUrl(profile.picture) : undefined,
    sub: typeof profile.sub === 'string' ? profile.sub : undefined,
  };
}

export function OidcCurrentUserProvider({ children }: PropsWithChildren) {
  const auth = useAuth();
  const [storedUser] = useState(readStoredOidcUser);
  const liveUser = auth.isAuthenticated && auth.user && !auth.user.expired ? auth.user : null;
  const signedInUser = liveUser ?? (auth.isLoading ? storedUser : null);

  const state: CurrentUserState = signedInUser
    ? {
        status: 'signed-in',
        accessToken: signedInUser.access_token,
        idToken: signedInUser.id_token,
        queryIdentity: signedInUser.profile.sub,
        profile: toProfile(signedInUser.profile),
        signOut: () =>
          void auth.signoutRedirect({
            id_token_hint: signedInUser.id_token,
            post_logout_redirect_uri: window.location.origin,
          }),
        refreshAccessToken: async () => {
          const renewed = await auth.signinSilent();
          if (!renewed?.access_token)
            throw new Error('OIDC token renewal returned no access token');
          return renewed.access_token;
        },
      }
    : auth.isLoading
      ? { status: 'loading' }
      : {
          status: 'signed-out',
          retry: Boolean(auth.error),
          // window.location, not useLocation() — this provider sits above the router.
          signIn: () =>
            void auth.signinRedirect({
              state: {
                returnTo: window.location.pathname + window.location.search + window.location.hash,
              },
            }),
        };

  return <CurrentUserContext.Provider value={state}>{children}</CurrentUserContext.Provider>;
}
