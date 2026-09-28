export const directMessageKey = (identity: string | undefined, workspaceId: string) =>
  ['direct-messages', identity, workspaceId] as const;
