import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessModule } from '@/components/communities/channel-access';
import { ChannelAudienceModule } from '@/components/communities/channel-audience';
import { ChannelMembershipsModule } from '@/components/communities/memberships';
import { MessagesModule } from '@/components/social/messages';
import { WorkspacesModule } from '@/components/workspaces';
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
    ChannelAccessModule,
    ChannelAudienceModule,
    ChannelMembershipsModule,
    DrizzleModule,
    MessagesModule,
    WorkspacesModule,
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
