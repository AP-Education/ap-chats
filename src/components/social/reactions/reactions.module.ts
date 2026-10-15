import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { MessagesModule } from '../messages';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';
import { DrizzleReactionsRepository } from './repository/drizzle-reactions.repository';
import { ReactionsRepository } from './repository/reactions.repository';

@Module({
  imports: [AuthModule, WorkspaceMembersModule, ChannelAccessPolicyModule, MessagesModule],
  controllers: [ReactionsController],
  providers: [
    ReactionsService,
    { provide: ReactionsRepository, useClass: DrizzleReactionsRepository },
  ],
})
export class ReactionsModule {}
