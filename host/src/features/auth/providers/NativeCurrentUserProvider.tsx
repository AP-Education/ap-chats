import { CurrentUserContext, type CurrentUserState } from '@ap/shell-sdk';
import { type PropsWithChildren, useState } from 'react';

import { refreshNativeToken, requestNativeSignOut } from '@/features/auth/api/native-bridge';
import { useNativeAuthBridge } from '@/features/auth/hooks/useNativeAuthBridge';
import { randomId } from '@/shared/lib/random-id';

export function NativeCurrentUserProvider({ children }: PropsWithChildren) {
  const native = useNativeAuthBridge();
  const [sessionIdentity] = useState(randomId);

  const state: CurrentUserState =
    native.status === 'signed-in'
      ? {
          status: 'signed-in',
          accessToken: native.accessToken,
          idToken: native.idToken,
          queryIdentity: native.profile?.sub ?? sessionIdentity,
          profile: native.profile,
          signOut: requestNativeSignOut,
          refreshAccessToken: refreshNativeToken,
        }
      : native.status === 'unavailable'
        ? { status: 'unavailable' }
        : { status: 'loading' };

  return <CurrentUserContext.Provider value={state}>{children}</CurrentUserContext.Provider>;
}
