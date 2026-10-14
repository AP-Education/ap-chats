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

// Shorter than the server's heartbeat timeout, so a socket it may have dropped is never trusted.
const RESUME_RECONNECT_MS = 15_000;

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

    // A page put away (a locked phone, a sleeping laptop) may come back to a socket the server
    // has already dropped while the client still reads it as connected, and the events missed
    // meanwhile never arrive. Coming back after a while, it reconnects, so everyone resyncs.
    let hiddenAt: number | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }

      const awayLong = hiddenAt !== null && Date.now() - hiddenAt >= RESUME_RECONNECT_MS;
      hiddenAt = null;
      if (!awayLong || !socket.connected) return;

      setState((current) => ({ ...current, status: 'reconnecting' }));
      socket.disconnect().connect();
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.disconnect();
    };
  }, []);

  return <RealtimeContext.Provider value={state}>{children}</RealtimeContext.Provider>;
}
