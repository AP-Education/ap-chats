import type { PropsWithChildren } from 'react';

import { refreshNativeToken, requestNativeSignOut } from '../api/native-bridge';
import { useNativeAuthBridge } from '../hooks/useNativeAuthBridge';
import { CurrentUserContext } from '../stores/current-user-context';
import type { CurrentUserState } from '../types';

export function NativeCurrentUserProvider({ children }: PropsWithChildren) {
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
