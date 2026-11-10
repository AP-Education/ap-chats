import { Module } from '@nestjs/common';

import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { SocialRealtimeModule } from '../realtime/social-realtime.module';
import { TypingGateway } from './typing.gateway';

@Module({
  imports: [WorkspaceMembersModule, ChannelAccessPolicyModule, SocialRealtimeModule],
  providers: [TypingGateway],
})
export class TypingModule {}
