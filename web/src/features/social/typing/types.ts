// Mirrors src/components/social/typing/typing.gateway.ts. Never persisted and
// never routed through social:changed: typing has no channel_entries position
// (docs/channel-history-model.md), so it owns its own event name and map
// instead of extending realtime's ServerToClientEvents/ClientToServerEvents.
export type TypingServerToClientEvents = {
  'social:typing': (payload: {
    workspaceId: string;
    channelId: string;
    memberId: string;
    isTyping: boolean;
  }) => void;
};

export type TypingClientToServerEvents = {
  'social:typing': (payload: { workspaceId: string; channelId: string; isTyping: boolean }) => void;
};
