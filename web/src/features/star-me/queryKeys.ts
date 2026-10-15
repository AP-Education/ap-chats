export const starMeQueryKeys = {
  status: (identity: string | undefined, workspaceId: string, channelId: string) =>
    ['star-me', 'status', identity, workspaceId, channelId] as const,
  picked: (
    identity: string | undefined,
    workspaceId: string,
    channelId: string,
    questionId: string,
  ) => ['star-me', 'picked', identity, workspaceId, channelId, questionId] as const,
};
