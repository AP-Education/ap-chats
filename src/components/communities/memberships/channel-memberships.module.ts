import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { DrizzleModule } from '@/database/drizzle';

import { ChannelPermissionsModule } from '../channel-access/permissions';
import { ChannelVisibilityModule } from '../channel-access/visibility';
import { ChannelMembershipsController } from './channel-memberships.controller';
import { ChannelMembershipsService } from './channel-memberships.service';
import { ChannelMembershipsRepository, DrizzleChannelMembershipsRepository } from './repository';

@Module({
  imports: [
    AuthModule,
    DrizzleModule,
    WorkspaceMembersModule,
    ChannelVisibilityModule,
    ChannelPermissionsModule,
  ],
  controllers: [ChannelMembershipsController],
  providers: [
    ChannelMembershipsService,
    { provide: ChannelMembershipsRepository, useClass: DrizzleChannelMembershipsRepository },
  ],
})
export class ChannelMembershipsModule {}
