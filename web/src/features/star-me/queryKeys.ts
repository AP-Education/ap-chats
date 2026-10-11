export const starMeQueryKeys = {
  picked: (
    identity: string | undefined,
    workspaceId: string,
    channelId: string,
    questionId: string,
  ) => ['star-me', 'picked', identity, workspaceId, channelId, questionId] as const,
};
