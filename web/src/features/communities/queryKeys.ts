export const communityQueryKeys = {
  channelLists: (identity: string | undefined, workspaceId: string | undefined) =>
    ['channels', identity, workspaceId] as const,
  channels: (identity: string | undefined, workspaceId: string | undefined, scope: string) =>
    ['channels', identity, workspaceId, scope] as const,
  channelDetails: (identity: string | undefined, workspaceId: string | undefined) =>
    ['channel', identity, workspaceId] as const,
  channel: (
    identity: string | undefined,
    workspaceId: string | undefined,
    channelId: string | undefined,
  ) => ['channel', identity, workspaceId, channelId] as const,
  categories: (identity: string | undefined, workspaceId: string | undefined) =>
    ['channel-categories', identity, workspaceId] as const,
  members: (identity: string | undefined, workspaceId: string, channelId: string | undefined) =>
    ['channel-members', identity, workspaceId, channelId] as const,
};
