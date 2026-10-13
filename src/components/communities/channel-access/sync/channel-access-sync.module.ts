import { Global, Module } from '@nestjs/common';

import { MemberAccessProjection } from '@/components/workspaces/access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { DrizzleModule } from '@/database/drizzle';

import { ChannelAudienceModule } from '../../channel-audience';
import { ChannelAccessSync } from './channel-access.sync';
import { ChannelAccessNoticesHandler } from './channel-access-notices.handler';
import { DrizzleParticipationRepository } from './repository/drizzle-participation.repository';
import { ParticipationRepository } from './repository/participation.repository';

/**
 * Recalculates participation when lists, roles or people change, and tells people what changed.
 * Global because roles and workspace membership, in another context, depend on its port.
 */
@Global()
@Module({
  imports: [DrizzleModule, WorkspaceMembersModule, ChannelAudienceModule],
  providers: [
    ChannelAccessSync,
    ChannelAccessNoticesHandler,
    { provide: MemberAccessProjection, useExisting: ChannelAccessSync },
    { provide: ParticipationRepository, useClass: DrizzleParticipationRepository },
  ],
  exports: [ChannelAccessSync, MemberAccessProjection],
})
export class ChannelAccessSyncModule {}
