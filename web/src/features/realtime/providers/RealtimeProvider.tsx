import { useCurrentUser } from '@ap-education/shell-sdk';
import type { PropsWithChildren } from 'react';

import { RealtimeContext } from '../stores/realtime-context';
import type { ConnectionState } from '../types';
import { ActiveConnection } from './ActiveConnection';

const idleState: ConnectionState = { status: 'idle', socket: null, error: null };

export function RealtimeProvider({ children }: PropsWithChildren) {
  const user = useCurrentUser();

  if (user.status !== 'signed-in') {
    return <RealtimeContext.Provider value={idleState}>{children}</RealtimeContext.Provider>;
  }

  return (
    <ActiveConnection accessToken={user.accessToken} refreshAccessToken={user.refreshAccessToken}>
      {children}
    </ActiveConnection>
  );
}
