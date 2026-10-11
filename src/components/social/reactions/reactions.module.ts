import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { ChannelAudienceModule } from '@/components/communities/channel-audience';
import { WorkspacesModule } from '@/components/workspaces';

import { ReactionsController } from './reactions.controller';
import { ReactionsFacade } from './reactions.facade';
import { ReactionsGateway } from './reactions.gateway';
import { DrizzleReactionsRepository } from './repository/drizzle-reactions.repository';
import { ReactionsRepository } from './repository/reactions.repository';

@Module({
  imports: [AuthModule, ChannelAccessModule, ChannelAudienceModule, WorkspacesModule],
  controllers: [ReactionsController],
  providers: [
    ReactionsFacade,
    ReactionsGateway,
    { provide: ReactionsRepository, useClass: DrizzleReactionsRepository },
  ],
})
export class ReactionsModule {}
