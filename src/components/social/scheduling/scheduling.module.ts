import { Module } from '@nestjs/common';

import { AuthModule } from '@/components/auth';
import { ChannelAccessPolicyModule } from '@/components/communities/channel-access/channel-access';
import { WorkspaceMembersModule } from '@/components/workspaces/members';

import { ContentModule } from '../content';
import { PostingModule } from '../posting';
import { DrizzleScheduledMessagesRepository, ScheduledMessagesRepository } from './repository';
import { ScheduleMessageService } from './schedule-message.service';
import { ScheduledDelivery } from './scheduled-delivery';
import { ScheduledMessagesController } from './scheduled-messages.controller';
import { ScheduledMessagesService } from './scheduled-messages.service';
import { SendScheduledMessageService } from './send-scheduled-message.service';

@Module({
  imports: [
    AuthModule,
    WorkspaceMembersModule,
    ChannelAccessPolicyModule,
    ContentModule,
    PostingModule,
  ],
  controllers: [ScheduledMessagesController],
  providers: [
    ScheduleMessageService,
    ScheduledMessagesService,
    SendScheduledMessageService,
    ScheduledDelivery,
    { provide: ScheduledMessagesRepository, useClass: DrizzleScheduledMessagesRepository },
  ],
})
export class SchedulingModule {}
