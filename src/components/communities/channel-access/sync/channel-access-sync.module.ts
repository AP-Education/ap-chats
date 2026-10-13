import { Module } from '@nestjs/common';

import { WorkspaceAccessModule } from '@/components/workspaces/access';
import { DrizzleModule } from '@/database/drizzle';

import { ChannelAccessSync } from './channel-access.sync';
import { DrizzleParticipationRepository } from './repository/drizzle-participation.repository';
import { ParticipationRepository } from './repository/participation.repository';

/** Recalculates participation whenever lists or roles change; registers itself with roles. */
@Module({
  imports: [DrizzleModule, WorkspaceAccessModule],
  providers: [
    ChannelAccessSync,
    { provide: ParticipationRepository, useClass: DrizzleParticipationRepository },
  ],
  exports: [ChannelAccessSync],
})
export class ChannelAccessSyncModule {}
