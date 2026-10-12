export const roleQueryKeys = {
  roles: (identity: string | undefined, workspaceId: string | undefined) =>
    ['roles', identity, workspaceId] as const,
  members: (identity: string | undefined, workspaceId: string, roleId: string | undefined) =>
    ['role-members', identity, workspaceId, roleId] as const,
};
