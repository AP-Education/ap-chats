import { useEffect, useEffectEvent } from 'react';

import { useConnection } from '../stores/realtime-context';
import type { ServerToClientEvents } from '../types';

// socket.io-client types `.on`/`.off` against one concrete event key; a caller-generic
// K can't be proven to match that conditional type, so we view the socket through this
// narrower, self-consistent emitter shape instead — the one boundary where a strongly
// typed socket meets our own generic wrapper.
interface TypedEmitter<Events> {
  on<K extends keyof Events>(event: K, listener: Events[K]): unknown;
  off<K extends keyof Events>(event: K, listener: Events[K]): unknown;
}

// Subscribes to a typed server event for as long as the component is mounted.
export function useSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K],
): void {
  const { socket } = useConnection();
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    if (!socket) return;
    const emitter = socket as unknown as TypedEmitter<ServerToClientEvents>;
    emitter.on(event, onEvent);
    return () => {
      emitter.off(event, onEvent);
    };
  }, [socket, event]);
}
