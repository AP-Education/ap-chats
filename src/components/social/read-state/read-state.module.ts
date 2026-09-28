import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access/channel-access.module';
import { WorkspacesModule } from '@/components/workspaces';

import { ReadStateController } from './read-state.controller';
import { ReadStateFacade } from './read-state.facade';
import { ReadStateGateway } from './read-state.gateway';
import { DrizzleReadStateRepository } from './repository/drizzle-read-state.repository';
import { ReadStateRepository } from './repository/read-state.repository';
import { WorkspaceReadStateController } from './workspace-read-state.controller';

@Module({
  imports: [AuthModule, ChannelAccessModule, WorkspacesModule],
  controllers: [ReadStateController, WorkspaceReadStateController],
  providers: [
    ReadStateFacade,
    ReadStateGateway,
    { provide: ReadStateRepository, useClass: DrizzleReadStateRepository },
  ],
  exports: [ReadStateFacade],
})
export class ReadStateModule {}
