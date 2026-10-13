import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { DrizzleModule } from '@/database/drizzle';

import { ChannelsModule } from '../../channels';
import { ChannelAccessSyncModule } from '../sync';
import { ChannelPermissionsController } from './channel-permissions.controller';
import { ChannelPermissionsService } from './channel-permissions.service';
import { ChannelVisibility } from './channel-visibility.service';
import { ChannelPermissionsRepository } from './repository/channel-permissions.repository';
import { DrizzleChannelPermissionsRepository } from './repository/drizzle-channel-permissions.repository';

@Module({
  imports: [
    AuthModule,
    DrizzleModule,
    WorkspaceMembersModule,
    ChannelAccessSyncModule,
    ChannelsModule,
  ],
  controllers: [ChannelPermissionsController],
  providers: [
    ChannelPermissionsService,
    ChannelVisibility,
    { provide: ChannelPermissionsRepository, useClass: DrizzleChannelPermissionsRepository },
  ],
  exports: [ChannelPermissionsService, ChannelVisibility],
})
export class ChannelPermissionsModule {}
