import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspacesModule } from '@/components/workspaces';

import { ChannelAccessModule } from '../channel-access';
import { ChannelMembershipsController } from './channel-memberships.controller';
import { ChannelMembershipsService } from './channel-memberships.service';
import { ChannelMembershipsRepositoryModule } from './channel-memberships-repository.module';

@Module({
  imports: [AuthModule, WorkspacesModule, ChannelAccessModule, ChannelMembershipsRepositoryModule],
  controllers: [ChannelMembershipsController],
  providers: [ChannelMembershipsService],
})
export class ChannelMembershipsModule {}
