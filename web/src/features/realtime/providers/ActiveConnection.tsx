import type { PropsWithChildren } from 'react';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { RealtimeConnection } from '../api/realtime-connection';
import { RealtimeContext } from '../stores/realtime-context';

interface ActiveConnectionProps {
  accessToken: string;
  refreshAccessToken?: () => Promise<string>;
}

export function ActiveConnection({
  accessToken,
  refreshAccessToken,
  children,
}: PropsWithChildren<ActiveConnectionProps>) {
  const [connection] = useState(() => new RealtimeConnection(accessToken, refreshAccessToken));
  const state = useSyncExternalStore(connection.subscribe, connection.getState);

  useEffect(() => connection.open(), [connection]);
  useEffect(() => connection.setToken(accessToken), [connection, accessToken]);

  return <RealtimeContext.Provider value={state}>{children}</RealtimeContext.Provider>;
}
