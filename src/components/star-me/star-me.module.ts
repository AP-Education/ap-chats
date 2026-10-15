import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { PostingModule } from '@/components/social/posting';
import { SocialRealtimeModule } from '@/components/social/realtime';
import { WorkspaceMembersModule } from '@/components/workspaces/members';
import { DrizzleModule } from '@/database/drizzle';

import { AiNativeAssistant, Assistant } from './assistant';
import { DrizzleStarMeRepository, StarMeRepository } from './repository';
import { StarMeController } from './star-me.controller';
import { StarMeGateway } from './star-me.gateway';
import { StarMeService } from './star-me.service';
import { StarMeActivity } from './star-me-activity';
import { StarMeEnrolment } from './star-me-enrolment';

@Module({
  imports: [
    AuthModule,
    ChannelAccessPolicyModule,
    DrizzleModule,
    PostingModule,
    SocialRealtimeModule,
    WorkspaceMembersModule,
  ],
  controllers: [StarMeController],
  providers: [
    StarMeService,
    StarMeActivity,
    StarMeEnrolment,
    StarMeGateway,
    { provide: Assistant, useClass: AiNativeAssistant },
    { provide: StarMeRepository, useClass: DrizzleStarMeRepository },
  ],
})
export class StarMeModule {}
