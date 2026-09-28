export const workspaceUnreadKey = (identity: string | undefined, workspaceId: string) =>
  ['read-state', identity, workspaceId] as const;

export const unreadDirectMessagesKey = (identity: string | undefined, workspaceId: string) =>
  [...workspaceUnreadKey(identity, workspaceId), 'direct-messages'] as const;
