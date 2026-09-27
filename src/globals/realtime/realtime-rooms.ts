export const RealtimeRooms = {
  user(appId: string, userId: string): string {
    return `app:${appId}:user:${userId}`;
  },
  socialChannel(workspaceId: string, channelId: string): string {
    return `social:workspace:${workspaceId}:channel:${channelId}`;
  },
  socialWorkspace(workspaceId: string): string {
    return `social:workspace:${workspaceId}`;
  },
  conversation(appId: string, conversationId: string): string {
    return `app:${appId}:conversation:${conversationId}`;
  },
} as const;
