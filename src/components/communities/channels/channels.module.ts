import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspacesModule } from '@/components/workspaces';

import { ChannelAccessModule } from '../channel-access/channel-access.module';
import { ChannelCategoriesModule } from '../channel-categories/channel-categories.module';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { ChannelsRepositoryModule } from './channels-repository.module';

@Module({
  imports: [
    AuthModule,
    WorkspacesModule,
    ChannelAccessModule,
    ChannelCategoriesModule,
    ChannelsRepositoryModule,
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService],
})
export class ChannelsModule {}
