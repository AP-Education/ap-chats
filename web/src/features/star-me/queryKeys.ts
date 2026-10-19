export const starMeQueryKeys = {
  status: (identity: string | undefined, workspaceId: string, channelId: string) =>
    ['star-me', 'status', identity, workspaceId, channelId] as const,
};
