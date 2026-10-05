import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { WorkspacesModule } from '@/components/workspaces';
import { PublisherModule } from '@/globals/publisher/publisher.module';

import { ReadStateController } from './read-state.controller';
import { ReadStateFacade } from './read-state.facade';
import { DrizzleReadStateRepository } from './repository/drizzle-read-state.repository';
import { ReadStateRepository } from './repository/read-state.repository';
import { WorkspaceReadStateController } from './workspace-read-state.controller';

@Module({
  imports: [AuthModule, ChannelAccessModule, PublisherModule, WorkspacesModule],
  controllers: [ReadStateController, WorkspaceReadStateController],
  providers: [
    ReadStateFacade,
    { provide: ReadStateRepository, useClass: DrizzleReadStateRepository },
  ],
  exports: [ReadStateFacade],
})
export class ReadStateModule {}
