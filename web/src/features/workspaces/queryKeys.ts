export const workspaceQueryKeys = {
  everyonesMembers: (identity: string | undefined) => ['workspace-members', identity] as const,
  members: (identity: string | undefined, workspaceId: string | undefined) =>
    ['workspace-members', identity, workspaceId] as const,
};
