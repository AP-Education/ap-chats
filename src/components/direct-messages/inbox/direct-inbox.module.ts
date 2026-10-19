import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { NotificationPolicyModule } from '@/components/notifications/policy';

import { DirectInboxService } from './direct-inbox.service';
import { DirectMessagesController } from './direct-messages.controller';
import { DirectInboxRepository } from './repository/direct-inbox.repository';
import { DrizzleDirectInboxRepository } from './repository/drizzle-direct-inbox.repository';

@Module({
  imports: [AuthModule, NotificationPolicyModule],
  controllers: [DirectMessagesController],
  providers: [
    DirectInboxService,
    { provide: DirectInboxRepository, useClass: DrizzleDirectInboxRepository },
  ],
  exports: [DirectInboxService],
})
export class DirectInboxModule {}
