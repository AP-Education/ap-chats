import { io } from 'socket.io-client';

import type { RealtimeSocketClient } from '../types';

// auth as a function runs on every reconnect attempt too, so a refreshed token is picked up.
export function createRealtimeSocket(getToken: () => string): RealtimeSocketClient {
  return io('/chats', {
    autoConnect: false,
    // Starting on polling and upgrading is more resilient through the dev proxy
    // than forcing websocket for the very first handshake request.
    auth: (callback) => callback({ token: getToken() }),
  });
}
