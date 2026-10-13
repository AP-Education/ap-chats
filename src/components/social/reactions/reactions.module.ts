import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { WorkspacesModule } from '@/components/workspaces';

import { MessagesModule } from '../messages';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';
import { DrizzleReactionsRepository } from './repository/drizzle-reactions.repository';
import { ReactionsRepository } from './repository/reactions.repository';

@Module({
  imports: [AuthModule, WorkspacesModule, ChannelAccessModule, MessagesModule],
  controllers: [ReactionsController],
  providers: [
    ReactionsService,
    { provide: ReactionsRepository, useClass: DrizzleReactionsRepository },
  ],
})
export class ReactionsModule {}
