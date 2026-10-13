import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { RolesModule } from '@/components/workspaces/roles';

import { MentionsController } from './mentions.controller';
import { MentionsFacade } from './mentions.facade';
import { DrizzleMentionsRepository } from './repository/drizzle-mentions.repository';
import { MentionsRepository } from './repository/mentions.repository';

@Module({
  imports: [AuthModule, WorkspaceMembersModule, RolesModule, ChannelAccessPolicyModule],
  controllers: [MentionsController],
  providers: [MentionsFacade, { provide: MentionsRepository, useClass: DrizzleMentionsRepository }],
  exports: [MentionsFacade],
})
export class MentionsModule {}
