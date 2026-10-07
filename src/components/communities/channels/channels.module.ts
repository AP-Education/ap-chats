import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspacesModule } from '@/components/workspaces';

import { ChannelAccessModule } from '../channel-access';
import { ChannelAudienceModule } from '../channel-audience';
import { ChannelCategoriesModule } from '../channel-categories/channel-categories.module';
import { ChannelsController } from './channels.controller';
import { ChannelsGateway } from './channels.gateway';
import { ChannelsService } from './channels.service';
import { ChannelsRepositoryModule } from './channels-repository.module';

@Module({
  imports: [
    AuthModule,
    WorkspacesModule,
    ChannelAccessModule,
    ChannelAudienceModule,
    ChannelCategoriesModule,
    ChannelsRepositoryModule,
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService, ChannelsGateway],
})
export class ChannelsModule {}
