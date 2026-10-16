export const schedulingQueryKeys = {
  channel: (identity: string | undefined, workspaceId: string, channelId: string) =>
    ['scheduled-messages', identity, workspaceId, channelId] as const,
};
