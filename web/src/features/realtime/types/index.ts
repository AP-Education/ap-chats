import type { Socket } from 'socket.io-client';

// Mirrors src/components/bootstrap/bootstrap.gateway.ts on the API, kept in sync by hand.
export interface ServerToClientEvents {
  'session:ready': (payload: { userId: string; appId: string }) => void;
  'social:changed': (payload: {
    type: string;
    workspaceId: string;
    channelId: string;
    messageId?: string;
    messageIds?: string[];
    seq?: string;
    lastSeq?: string;
  }) => void;
  'social:unread': (payload: {
    workspaceId: string;
    channelId: string;
    type: string;
    actorMemberId?: string;
  }) => void;
}

interface ClientToServerEvents {
  'social:watch': (payload: { workspaceId: string; channelId: string }) => void;
  'social:unwatch': (payload: { workspaceId: string; channelId: string }) => void;
  'social:watch-workspace': (payload: { workspaceId: string }) => void;
  'social:unwatch-workspace': (payload: { workspaceId: string }) => void;
}

export type RealtimeSocketClient = Socket<ServerToClientEvents, ClientToServerEvents>;

export type SocketAuthErrorCode =
  'AUTH_TOKEN_MISSING' | 'AUTH_TOKEN_EXPIRED' | 'AUTH_TOKEN_INVALID';

export type ConnectionError =
  { kind: 'auth'; code: SocketAuthErrorCode } | { kind: 'network'; message: string };

export interface ConnectionState {
  status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  socket: RealtimeSocketClient | null;
  error: ConnectionError | null;
}
