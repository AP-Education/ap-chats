import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { ConversationSearchController } from './conversation-search.controller';
import { ConversationSearchRepository } from './conversation-search.repository';
import { ConversationSearchService } from './conversation-search.service';
import { DrizzleConversationSearchRepository } from './drizzle-conversation-search.repository';

@Module({
  imports: [AuthModule, WorkspaceMembersModule],
  controllers: [ConversationSearchController],
  providers: [
    ConversationSearchService,
    {
      provide: ConversationSearchRepository,
      useClass: DrizzleConversationSearchRepository,
    },
  ],
})
export class ConversationSearchModule {}
