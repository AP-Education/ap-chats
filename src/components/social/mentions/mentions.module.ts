import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { WorkspacesModule } from '@/components/workspaces';

import { MentionsController } from './mentions.controller';
import { MentionsService } from './mentions.service';
import { DrizzleMentionsRepository } from './repository/drizzle-mentions.repository';
import { MentionsRepository } from './repository/mentions.repository';

@Module({
  imports: [AuthModule, WorkspacesModule, ChannelAccessModule],
  controllers: [MentionsController],
  providers: [
    MentionsService,
    { provide: MentionsRepository, useClass: DrizzleMentionsRepository },
  ],
  exports: [MentionsService],
})
export class MentionsModule {}
