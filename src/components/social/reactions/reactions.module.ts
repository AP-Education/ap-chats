import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { ChannelAudienceModule } from '@/components/communities/channel-audience';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { ReactionsController } from './reactions.controller';
import { ReactionsFacade } from './reactions.facade';
import { ReactionsGateway } from './reactions.gateway';
import { DrizzleReactionsRepository } from './repository/drizzle-reactions.repository';
import { ReactionsRepository } from './repository/reactions.repository';

@Module({
  imports: [AuthModule, ChannelAccessPolicyModule, ChannelAudienceModule, WorkspaceMembersModule],
  controllers: [ReactionsController],
  providers: [
    ReactionsFacade,
    ReactionsGateway,
    { provide: ReactionsRepository, useClass: DrizzleReactionsRepository },
  ],
})
export class ReactionsModule {}
