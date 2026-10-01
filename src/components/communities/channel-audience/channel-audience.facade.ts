import { Injectable } from '@nestjs/common';

import { ChannelAudienceRepository } from './repository/channel-audience.repository';
import type { ChannelRecipient } from './types';

@Injectable()
export class ChannelAudienceFacade {
  constructor(private readonly audience: ChannelAudienceRepository) {}

  recipients(workspaceId: string, channelId: string): Promise<ChannelRecipient[]> {
    return this.audience.recipients(workspaceId, channelId);
  }

  allowedUserIds(
    workspaceId: string,
    channelId: string,
    candidateUserIds: string[],
  ): Promise<string[]> {
    return this.audience.allowedUserIds(workspaceId, channelId, candidateUserIds);
  }
}
