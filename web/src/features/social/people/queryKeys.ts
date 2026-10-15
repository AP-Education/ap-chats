export const peopleQueryKeys = {
  profiles: (identity: string | undefined, workspaceId: string | undefined) =>
    ['member-profile', identity, workspaceId] as const,
  profile: (identity: string | undefined, workspaceId: string | undefined, memberId: string) =>
    ['member-profile', identity, workspaceId, memberId] as const,
};
