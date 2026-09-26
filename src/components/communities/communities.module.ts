import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspacesModule } from '@/components/workspaces';
import { DrizzleModule } from '@/database/drizzle';

import { ChannelCategoriesController } from './channel-categories/channel-categories.controller';
import { ChannelCategoriesService } from './channel-categories/channel-categories.service';
import {
  ChannelCategoriesRepository,
  DrizzleChannelCategoriesRepository,
} from './channel-categories/repository';
import { ChannelsController } from './channels/channels.controller';
import { ChannelsService } from './channels/channels.service';
import { ChannelsRepository, DrizzleChannelsRepository } from './channels/repository';
import { CommunityAccessService } from './community-access.service';
import { ChannelMembershipsController } from './memberships/channel-memberships.controller';
import { ChannelMembershipsService } from './memberships/channel-memberships.service';
import {
  ChannelMembershipsRepository,
  DrizzleChannelMembershipsRepository,
} from './memberships/repository';

@Module({
  imports: [AuthModule, DrizzleModule, WorkspacesModule],
  controllers: [ChannelCategoriesController, ChannelsController, ChannelMembershipsController],
  providers: [
    CommunityAccessService,
    ChannelCategoriesService,
    { provide: ChannelCategoriesRepository, useClass: DrizzleChannelCategoriesRepository },
    ChannelsService,
    { provide: ChannelsRepository, useClass: DrizzleChannelsRepository },
    ChannelMembershipsService,
    { provide: ChannelMembershipsRepository, useClass: DrizzleChannelMembershipsRepository },
  ],
})
export class CommunitiesModule {}
