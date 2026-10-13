import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { ReadStateModule } from '../read-state/read-state.module';
import { HistoryController } from './history.controller';
import { HistoryFacade } from './history.facade';
import { DrizzleHistoryRepository } from './repository/drizzle-history.repository';
import { HistoryRepository } from './repository/history.repository';

@Module({
  imports: [AuthModule, ChannelAccessPolicyModule, WorkspaceMembersModule, ReadStateModule],
  controllers: [HistoryController],
  providers: [HistoryFacade, { provide: HistoryRepository, useClass: DrizzleHistoryRepository }],
  exports: [HistoryFacade],
})
export class HistoryModule {}
