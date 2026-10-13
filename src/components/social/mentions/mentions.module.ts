import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { RolesModule } from '@/components/workspaces/roles';

import { MentionsController } from './mentions.controller';
import { MentionsService } from './mentions.service';
import { DrizzleMentionsRepository } from './repository/drizzle-mentions.repository';
import { MentionsRepository } from './repository/mentions.repository';

@Module({
  imports: [AuthModule, WorkspaceMembersModule, RolesModule, ChannelAccessPolicyModule],
  controllers: [MentionsController],
  providers: [
    MentionsService,
    { provide: MentionsRepository, useClass: DrizzleMentionsRepository },
  ],
  exports: [MentionsService],
})
export class MentionsModule {}
