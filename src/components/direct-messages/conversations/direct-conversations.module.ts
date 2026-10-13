import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { NotificationPreferencesModule } from '@/components/notifications/preferences';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { DirectInboxModule } from '../inbox';
import { DirectConversationsService } from './direct-conversations.service';
import { DirectConversationsRepository } from './repository/direct-conversations.repository';
import { DrizzleDirectConversationsRepository } from './repository/drizzle-direct-conversations.repository';
import { WorkspaceDirectMessagesController } from './workspace-direct-messages.controller';

@Module({
  imports: [AuthModule, WorkspaceMembersModule, DirectInboxModule, NotificationPreferencesModule],
  controllers: [WorkspaceDirectMessagesController],
  providers: [
    DirectConversationsService,
    { provide: DirectConversationsRepository, useClass: DrizzleDirectConversationsRepository },
  ],
  exports: [DirectConversationsService],
})
export class DirectConversationsModule {}
