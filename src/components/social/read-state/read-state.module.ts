import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access/channel-access.module';
import { WorkspacesModule } from '@/components/workspaces';

import { ReadStateController } from './read-state.controller';
import { ReadStateFacade } from './read-state.facade';
import { DrizzleReadStateRepository } from './repository/drizzle-read-state.repository';
import { ReadStateRepository } from './repository/read-state.repository';

@Module({
  imports: [AuthModule, ChannelAccessModule, WorkspacesModule],
  controllers: [ReadStateController],
  providers: [
    ReadStateFacade,
    { provide: ReadStateRepository, useClass: DrizzleReadStateRepository },
  ],
  exports: [ReadStateFacade],
})
export class ReadStateModule {}
