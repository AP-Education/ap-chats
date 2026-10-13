import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { PublisherModule } from '@/globals/publisher/publisher.module';

import { ReadStateController } from './read-state.controller';
import { ReadStateFacade } from './read-state.facade';
import { DrizzleReadStateRepository } from './repository/drizzle-read-state.repository';
import { ReadStateRepository } from './repository/read-state.repository';
import { WorkspaceReadStateController } from './workspace-read-state.controller';

@Module({
  imports: [AuthModule, ChannelAccessPolicyModule, PublisherModule, WorkspaceMembersModule],
  controllers: [ReadStateController, WorkspaceReadStateController],
  providers: [
    ReadStateFacade,
    { provide: ReadStateRepository, useClass: DrizzleReadStateRepository },
  ],
  exports: [ReadStateFacade],
})
export class ReadStateModule {}
