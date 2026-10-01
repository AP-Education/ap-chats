import type { ChannelRecipient } from '../types';

export abstract class ChannelAudienceRepository {
  abstract recipients(workspaceId: string, channelId: string): Promise<ChannelRecipient[]>;
  abstract allowedUserIds(
    workspaceId: string,
    channelId: string,
    candidateUserIds: string[],
  ): Promise<string[]>;
}
