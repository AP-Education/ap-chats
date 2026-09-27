export const messagingQueryKeys = {
  channel: (identity: string | undefined, workspaceId: string, channelId: string) =>
    ['messaging', identity, workspaceId, channelId] as const,
  history: (
    identity: string | undefined,
    workspaceId: string,
    channelId: string,
    messageId?: string,
  ) => ['messaging', identity, workspaceId, channelId, 'history', messageId ?? 'unread'] as const,
};
