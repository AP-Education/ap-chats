import type { Socket } from 'socket.io-client';

// The shape any socket event map must have to be usable with useSocketEvent.
// A lower bound (never[] params), not an upper one: every concrete listener
// signature is assignable to it, so it constrains without narrowing.
export type SocketEventMap = Record<string, (...args: never[]) => unknown>;

export interface UnreadMutation {
  workspaceId: string;
  channelId: string;
  kind: 'public' | 'private' | 'dm';
  eventId: string;
  operation: 'append' | 'remove';
  subject: 'message' | 'call';
  entries: { seq: string; authorMemberId: string }[];
  alert: boolean;
}

// Mirrors src/components/bootstrap/bootstrap.gateway.ts on the API, kept in sync by hand.
// Only realtime's own protocol lives here: session lifecycle and the watch/unwatch
// subscription model. A business domain (e.g. calls) owns its own event map instead
// of appending to this one, and subscribes through useSocketEvent<ItsOwnMap>.
export type ServerToClientEvents = {
  'session:ready': (payload: { userId: string; appId: string }) => void;
  'social:changed': (payload: {
    type: string;
    workspaceId: string;
    channelId: string;
    messageId?: string;
    messageIds?: string[];
    // Set only for 'social.call.created': calls are a different producer onto
    // this same shared channel-timeline broadcast, not a realtime concern.
    callId?: string;
    seq?: string;
    lastSeq?: string;
  }) => void;
  'social:unread': (payload: UnreadMutation) => void;
  'social:read-state': (payload: {
    workspaceId: string;
    channelId: string;
    lastReadEntrySeq: string;
    unreadCount: number;
  }) => void;
};

interface ClientToServerEvents {
  'social:watch': (payload: { workspaceId: string; channelId: string }) => void;
  'social:unwatch': (payload: { workspaceId: string; channelId: string }) => void;
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
