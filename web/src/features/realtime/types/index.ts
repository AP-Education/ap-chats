import type { Socket } from 'socket.io-client';

// Mirrors src/components/bootstrap/bootstrap.gateway.ts on the API, kept in sync by hand.
export interface ServerToClientEvents {
  'session:ready': (payload: { userId: string; appId: string }) => void;
}

// /chats has no client-to-server events, every client action goes through REST.
type NoClientEvents = Record<string, (...args: never[]) => void>;

export type RealtimeSocketClient = Socket<ServerToClientEvents, NoClientEvents>;

export type SocketAuthErrorCode =
  'AUTH_TOKEN_MISSING' | 'AUTH_TOKEN_EXPIRED' | 'AUTH_TOKEN_INVALID';

export type ConnectionError =
  { kind: 'auth'; code: SocketAuthErrorCode } | { kind: 'network'; message: string };

export interface ConnectionState {
  status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  socket: RealtimeSocketClient | null;
  error: ConnectionError | null;
}
