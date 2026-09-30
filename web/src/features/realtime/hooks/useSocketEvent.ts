import { useEffect, useEffectEvent } from 'react';

import { useConnection } from '../stores/realtime-context';
import type { ServerToClientEvents, SocketEventMap } from '../types';

// socket.io-client types `.on`/`.off` against one concrete event map; a caller-generic
// Events can't be proven to match that conditional type, so we view the socket through
// this narrower, self-consistent emitter shape instead — the one boundary where a
// strongly typed socket meets our own generic wrapper.
interface TypedEmitter<Events extends SocketEventMap> {
  on<K extends keyof Events>(event: K, listener: Events[K]): unknown;
  off<K extends keyof Events>(event: K, listener: Events[K]): unknown;
}

/**
 * Subscribes to a typed server event for as long as the component is mounted.
 * Defaults to realtime's own event map; a domain that isn't realtime's concern
 * (e.g. calls) passes its own map instead of realtime carrying its event names:
 * `useSocketEvent<CallServerToClientEvents>('call:incoming', handler)`.
 */
export function useSocketEvent<
  Events extends SocketEventMap = ServerToClientEvents,
  K extends keyof Events = keyof Events,
>(event: K, handler: Events[K]): void {
  const { socket } = useConnection();
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    if (!socket) return;
    const emitter = socket as unknown as TypedEmitter<Events>;
    emitter.on(event, onEvent);
    return () => {
      emitter.off(event, onEvent);
    };
  }, [socket, event]);
}
