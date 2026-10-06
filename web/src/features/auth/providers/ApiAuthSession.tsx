import { useCurrentUser } from '@ap/shell-sdk';
import { useEffect } from 'react';

import { setApiAuthSession } from '@/shared/api/http';

export function ApiAuthSession() {
  const user = useCurrentUser();
  const identity = user.status === 'signed-in' ? user.queryIdentity : null;
  const token = user.status === 'signed-in' ? user.accessToken : null;
  const refresh = user.status === 'signed-in' ? user.refreshAccessToken : undefined;

  useEffect(() => {
    setApiAuthSession(identity && token && refresh ? { identity, token, refresh } : null);
    return () => setApiAuthSession(null);
  }, [identity, token, refresh]);

  return null;
}
