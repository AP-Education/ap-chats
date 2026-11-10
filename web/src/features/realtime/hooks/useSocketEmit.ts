import { useCallback } from 'react';

import { useConnection } from '../stores/realtime-context';
import type { SocketEventMap } from '../types';

// The emit-side mirror of useSocketEvent's TypedEmitter: socket.io-client types
// `.emit` against one concrete event map, so a caller-generic Events is viewed
// through this narrower, self-consistent shape instead.
interface TypedEmitter<Events extends SocketEventMap> {
  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): unknown;
}

/**
 * Returns a typed emitter for client-to-server events. Defaults to realtime's
 * own event map; a business domain (e.g. typing) owns its own map instead of
 * extending realtime's ClientToServerEvents:
 * `useSocketEmit<TypingClientToServerEvents>()('social:typing', payload)`.
 */
export function useSocketEmit<Events extends SocketEventMap>() {
  const { socket } = useConnection();

  return useCallback(
    <K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) => {
      if (!socket) return;
      (socket as unknown as TypedEmitter<Events>).emit(event, ...args);
    },
    [socket],
  );
}
