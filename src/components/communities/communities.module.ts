import { Module } from '@nestjs/common';

import { ChannelAccessModule } from './channel-access';
import { ChannelAudienceModule } from './channel-audience';
import { ChannelCategoriesModule } from './channel-categories/channel-categories.module';
import { ChannelsModule } from './channels/channels.module';
import { ChannelMembershipsModule } from './memberships/channel-memberships.module';

@Module({
  imports: [
    ChannelAccessModule,
    ChannelAudienceModule,
    ChannelCategoriesModule,
    ChannelsModule,
    ChannelMembershipsModule,
  ],
})
export class CommunitiesModule {}
