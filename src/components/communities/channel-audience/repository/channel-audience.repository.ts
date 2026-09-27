export abstract class ChannelAudienceRepository {
  abstract allowedUserIds(
    workspaceId: string,
    channelId: string,
    candidateUserIds: string[],
  ): Promise<string[]>;
}
