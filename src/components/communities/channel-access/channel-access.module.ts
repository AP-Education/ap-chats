import { Module } from '@nestjs/common';

import { ChannelsRepositoryModule } from '../channels/channels-repository.module';
import { ChannelMembershipsRepositoryModule } from '../memberships/channel-memberships-repository.module';
import { ChannelAccessFacade } from './channel-access.facade';
import { CommunityAccessService } from './community-access.service';
import { ChannelAccessRepository } from './repository/channel-access.repository';
import { DrizzleChannelAccessRepository } from './repository/drizzle-channel-access.repository';

@Module({
  imports: [ChannelsRepositoryModule, ChannelMembershipsRepositoryModule],
  providers: [
    CommunityAccessService,
    ChannelAccessFacade,
    { provide: ChannelAccessRepository, useClass: DrizzleChannelAccessRepository },
  ],
  exports: [CommunityAccessService, ChannelAccessFacade],
})
export class ChannelAccessModule {}
