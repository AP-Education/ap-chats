import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { DrizzleModule } from '@/database/drizzle';

import { ChannelAccessSyncModule } from '../sync';
import { ChannelVisibilityModule } from '../visibility';
import { ChannelPermissionsController } from './channel-permissions.controller';
import { ChannelPermissionsService } from './channel-permissions.service';
import { ChannelPermissionsRepository } from './repository/channel-permissions.repository';
import { DrizzleChannelPermissionsRepository } from './repository/drizzle-channel-permissions.repository';

@Module({
  imports: [
    AuthModule,
    DrizzleModule,
    WorkspaceMembersModule,
    ChannelAccessSyncModule,
    ChannelVisibilityModule,
  ],
  controllers: [ChannelPermissionsController],
  providers: [
    ChannelPermissionsService,
    { provide: ChannelPermissionsRepository, useClass: DrizzleChannelPermissionsRepository },
  ],
  exports: [ChannelPermissionsService],
})
export class ChannelPermissionsModule {}
