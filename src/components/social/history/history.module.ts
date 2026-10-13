import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { WorkspacesModule } from '@/components/workspaces';

import { ReadStateModule } from '../read-state';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { DrizzleHistoryRepository } from './repository/drizzle-history.repository';
import { HistoryRepository } from './repository/history.repository';

@Module({
  imports: [AuthModule, ChannelAccessModule, WorkspacesModule, ReadStateModule],
  controllers: [HistoryController],
  providers: [HistoryService, { provide: HistoryRepository, useClass: DrizzleHistoryRepository }],
})
export class HistoryModule {}
