import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { WorkspacesModule } from '@/components/workspaces';

import { ReadStateController } from './read-state.controller';
import { ReadStateService } from './read-state.service';
import { DrizzleReadStateRepository } from './repository/drizzle-read-state.repository';
import { ReadStateRepository } from './repository/read-state.repository';
import { WorkspaceReadStateController } from './workspace-read-state.controller';

@Module({
  imports: [AuthModule, ChannelAccessModule, WorkspacesModule],
  controllers: [ReadStateController, WorkspaceReadStateController],
  providers: [
    ReadStateService,
    { provide: ReadStateRepository, useClass: DrizzleReadStateRepository },
  ],
  exports: [ReadStateService],
})
export class ReadStateModule {}
