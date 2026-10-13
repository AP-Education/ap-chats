import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { ReadStateController } from './read-state.controller';
import { ReadStateService } from './read-state.service';
import { DrizzleReadStateRepository } from './repository/drizzle-read-state.repository';
import { ReadStateRepository } from './repository/read-state.repository';
import { WorkspaceReadStateController } from './workspace-read-state.controller';

@Module({
  imports: [AuthModule, ChannelAccessPolicyModule, WorkspaceMembersModule],
  controllers: [ReadStateController, WorkspaceReadStateController],
  providers: [
    ReadStateService,
    { provide: ReadStateRepository, useClass: DrizzleReadStateRepository },
  ],
  exports: [ReadStateService],
})
export class ReadStateModule {}
