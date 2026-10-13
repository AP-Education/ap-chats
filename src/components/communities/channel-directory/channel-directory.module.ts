import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { ChannelPermissionsModule } from '../channel-access/permissions';
import { ChannelCategoriesModule } from '../channel-categories';
import { ChannelsModule } from '../channels';
import { ChannelDirectoryController } from './channel-directory.controller';
import { ChannelDirectoryService } from './channel-directory.service';

@Module({
  imports: [
    AuthModule,
    WorkspaceMembersModule,
    ChannelsModule,
    ChannelCategoriesModule,
    ChannelPermissionsModule,
  ],
  controllers: [ChannelDirectoryController],
  providers: [ChannelDirectoryService],
})
export class ChannelDirectoryModule {}
