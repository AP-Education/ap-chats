import type { PropsWithChildren } from 'react';

import { getAppShell } from '@/lib/app-shell';

import { useCurrentUser } from '../../auth/stores/current-user-context';
import { BrowserPushContext } from './browser-push-context';
import { useBrowserPushRegistration } from './useBrowserPushRegistration';

export function BrowserPushProvider({ children }: PropsWithChildren) {
  const user = useCurrentUser();
  const account =
    user.status === 'signed-in' ? { identity: user.queryIdentity, token: user.accessToken } : null;
  const push = useBrowserPushRegistration(account, getAppShell().kind === 'browser');

  return <BrowserPushContext.Provider value={push}>{children}</BrowserPushContext.Provider>;
}
