import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';

import { CallsHistoryController } from './calls-history.controller';
import { CallsHistoryService } from './calls-history.service';
import { CallsHistoryRepository } from './repository/calls-history.repository';
import { DrizzleCallsHistoryRepository } from './repository/drizzle-calls-history.repository';

@Module({
  imports: [AuthModule],
  controllers: [CallsHistoryController],
  providers: [
    CallsHistoryService,
    { provide: CallsHistoryRepository, useClass: DrizzleCallsHistoryRepository },
  ],
})
export class CallsHistoryModule {}
