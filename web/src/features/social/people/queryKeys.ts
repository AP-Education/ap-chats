export const peopleQueryKeys = {
  profile: (identity: string | undefined, workspaceId: string | undefined, memberId: string) =>
    ['member-profile', identity, workspaceId, memberId] as const,
};
