import type { PropsWithChildren } from 'react';
import { useEffect, useEffectEvent, useState } from 'react';

import { createRealtimeSocket } from '../api/socket-client';
import { RealtimeContext } from '../stores/realtime-context';
import type { ConnectionError, ConnectionState, SocketAuthErrorCode } from '../types';

const AUTH_ERROR_CODES: readonly string[] = [
  'AUTH_TOKEN_MISSING',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_INVALID',
];

function toConnectionError(error: Error & { data?: { code?: unknown } }): ConnectionError {
  const code = error.data?.code;
  return typeof code === 'string' && AUTH_ERROR_CODES.includes(code)
    ? { kind: 'auth', code: code as SocketAuthErrorCode }
    : { kind: 'network', message: error.message };
}

interface ActiveConnectionProps {
  accessToken: string;
  refreshAccessToken?: () => Promise<string>;
}

export function ActiveConnection({
  accessToken,
  refreshAccessToken,
  children,
}: PropsWithChildren<ActiveConnectionProps>) {
  const [state, setState] = useState<ConnectionState>({
    status: 'connecting',
    socket: null,
    error: null,
  });

  // useEffectEvent: socket.io calls this on every (re)connection attempt, so it
  // always needs the latest token without forcing the effect below to re-run.
  const getToken = useEffectEvent(() => accessToken);
  const tryRefresh = useEffectEvent(() => refreshAccessToken?.());

  useEffect(() => {
    const socket = createRealtimeSocket(getToken);

    const handleConnect = () => setState({ status: 'connected', socket, error: null });

    // Network errors are left to socket.io's own backoff loop (see createRealtimeSocket).
    // Auth errors need a decision: an expired token is worth one refresh-and-retry: if
    // that fails or isn't available, retrying with the same bad token can never
    // succeed, so we stop the Manager instead of hammering the server forever.
    const handleConnectError = async (error: Error & { data?: { code?: unknown } }) => {
      const connectionError = toConnectionError(error);

      if (connectionError.kind === 'auth' && connectionError.code === 'AUTH_TOKEN_EXPIRED') {
        try {
          const freshToken = await tryRefresh();
          if (freshToken) {
            socket.auth = { token: freshToken };
            socket.connect();
            return;
          }
        } catch {
          // Falls through to the dead-end path below.
        }
      }

      if (connectionError.kind === 'auth') {
        socket.io.reconnection(false);
      }
      setState({ status: 'error', socket, error: connectionError });
    };

    const handleDisconnect = (reason: string) => {
      // Our own cleanup calls disconnect() too, don't flag that as an outage.
      if (reason === 'io client disconnect') return;
      setState((current) => ({ ...current, status: 'reconnecting' }));
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
    };
  }, []);

  return <RealtimeContext.Provider value={state}>{children}</RealtimeContext.Provider>;
}
