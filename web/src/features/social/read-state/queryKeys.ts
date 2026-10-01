export const workspaceUnreadKey = (identity: string | undefined, workspaceId: string | undefined) =>
  ['read-state', identity, workspaceId] as const;

export const unreadDirectMessagesKey = (
  identity: string | undefined,
  workspaceId: string | undefined,
) => [...workspaceUnreadKey(identity, workspaceId), 'direct-messages'] as const;
