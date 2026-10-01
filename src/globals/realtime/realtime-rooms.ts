export const RealtimeRooms = {
  // Every device a person is connected from joins the same room: a personal
  // event (an incoming call, say) must reach all of them, not just one app.
  user(userId: string): string {
    return `user:${userId}`;
  },
  socialChannel(workspaceId: string, channelId: string): string {
    return `social:workspace:${workspaceId}:channel:${channelId}`;
  },
  conversation(conversationId: string): string {
    return `conversation:${conversationId}`;
  },
} as const;
