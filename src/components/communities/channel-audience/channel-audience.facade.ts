import { Injectable } from '@nestjs/common';

import { ChannelAudienceRepository } from './repository/channel-audience.repository';

@Injectable()
export class ChannelAudienceFacade {
  constructor(private readonly audience: ChannelAudienceRepository) {}

  allowedUserIds(
    workspaceId: string,
    channelId: string,
    candidateUserIds: string[],
  ): Promise<string[]> {
    return this.audience.allowedUserIds(workspaceId, channelId, candidateUserIds);
  }
}
