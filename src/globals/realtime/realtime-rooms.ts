export const RealtimeRooms = {
  user(appId: string, userId: string): string {
    return `app:${appId}:user:${userId}`;
  },
  conversation(appId: string, conversationId: string): string {
    return `app:${appId}:conversation:${conversationId}`;
  },
} as const;
