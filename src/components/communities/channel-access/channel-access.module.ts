import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspacesModule } from '@/components/workspaces';

import { ChannelAudienceModule } from '../channel-audience';
import { ChannelsRepositoryModule } from '../channels';
import { ChannelMembershipsRepositoryModule } from '../memberships/channel-memberships-repository.module';
import { ChannelAccessFacade } from './channel-access.facade';
import { ChannelAccessGateway } from './channel-access.gateway';
import { CommunityAccessService } from './community-access.service';
import { ChannelPermissionsController } from './permissions/channel-permissions.controller';
import { ChannelPermissionsService } from './permissions/channel-permissions.service';
import { ChannelPermissionsRepository } from './permissions/repository/channel-permissions.repository';
import { DrizzleChannelPermissionsRepository } from './permissions/repository/drizzle-channel-permissions.repository';
import { ChannelAccessRepository } from './repository/channel-access.repository';
import { DrizzleChannelAccessRepository } from './repository/drizzle-channel-access.repository';
import { ChannelAccessSync } from './sync/channel-access.sync';

@Module({
  imports: [
    AuthModule,
    WorkspacesModule,
    ChannelAudienceModule,
    ChannelsRepositoryModule,
    ChannelMembershipsRepositoryModule,
  ],
  controllers: [ChannelPermissionsController],
  providers: [
    CommunityAccessService,
    ChannelAccessFacade,
    ChannelAccessGateway,
    ChannelAccessSync,
    ChannelPermissionsService,
    { provide: ChannelAccessRepository, useClass: DrizzleChannelAccessRepository },
    { provide: ChannelPermissionsRepository, useClass: DrizzleChannelPermissionsRepository },
  ],
  exports: [
    CommunityAccessService,
    ChannelAccessFacade,
    ChannelAccessSync,
    ChannelPermissionsRepository,
  ],
})
export class ChannelAccessModule {}
