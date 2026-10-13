import { Module } from '@nestjs/common';

import { ChannelAccessModule } from './channel-access';
import { ChannelAudienceModule } from './channel-audience';
import { ChannelCategoriesModule } from './channel-categories';
import { ChannelDirectoryModule } from './channel-directory';
import { ChannelsModule } from './channels';
import { ChannelMembershipsModule } from './memberships';

@Module({
  imports: [
    ChannelsModule,
    ChannelCategoriesModule,
    ChannelAudienceModule,
    ChannelAccessModule,
    ChannelMembershipsModule,
    ChannelDirectoryModule,
  ],
})
export class CommunitiesModule {}
