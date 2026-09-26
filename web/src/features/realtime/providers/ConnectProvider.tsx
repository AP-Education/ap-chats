import type { PropsWithChildren } from 'react';

import { useCurrentUser } from '../../auth/stores/current-user-context';
import { ConnectContext } from '../stores/connect-context';
import type { ConnectionState } from '../types';
import { ActiveConnection } from './ActiveConnection';

const idleState: ConnectionState = { status: 'idle', socket: null, error: null };

export function ConnectProvider({ children }: PropsWithChildren) {
  const user = useCurrentUser();

  if (user.status !== 'signed-in') {
    return <ConnectContext.Provider value={idleState}>{children}</ConnectContext.Provider>;
  }

  return (
    <ActiveConnection accessToken={user.accessToken} refreshAccessToken={user.refreshAccessToken}>
      {children}
    </ActiveConnection>
  );
}
