import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access/channel-access.module';
import { WorkspacesModule } from '@/components/workspaces';

import { MentionsController } from './mentions.controller';
import { MentionsFacade } from './mentions.facade';
import { DrizzleMentionsRepository } from './repository/drizzle-mentions.repository';
import { MentionsRepository } from './repository/mentions.repository';

@Module({
  imports: [AuthModule, WorkspacesModule, ChannelAccessModule],
  controllers: [MentionsController],
  providers: [MentionsFacade, { provide: MentionsRepository, useClass: DrizzleMentionsRepository }],
  exports: [MentionsFacade],
})
export class MentionsModule {}
