import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher';

import { MessageComposer } from '../posting';
import type { MessageDraft } from '../posting/types';
import type { ScheduleMessageDto } from './dto/scheduled-message.dto';
import {
  SCHEDULED_MESSAGES_CHANGED_EVENT,
  ScheduledMessagesChangedEvent,
} from './events/scheduled-messages-changed.event';
import { ScheduledMessagesRepository } from './repository';
import { requireRoomInSchedule, requireSendTime } from './scheduled-message.rules';
import { scheduledMessageView } from './scheduled-message-view';

@Injectable()
export class ScheduleMessageService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly composer: MessageComposer,
    private readonly repository: ScheduledMessagesRepository,
    private readonly events: EventPublisher,
  ) {}

  async schedule(author: WorkspaceMember, channelId: string, request: ScheduleMessageDto) {
    if (request.attachments?.length)
      throw new BadRequestException('A scheduled message cannot carry files');
    requireSendTime(request.sendAt);
    const draft = await this.composer.draft(request);

    const { scheduled, announce } = await this.keep(author, channelId, request.sendAt, draft);
    announce();

    return scheduledMessageView(scheduled);
  }

  // Composed now, so a reply target or quote that is wrong fails here rather than at the send time.
  @Transactional()
  private async keep(
    author: WorkspaceMember,
    channelId: string,
    sendAt: Date,
    draft: MessageDraft,
  ) {
    const channel = await this.access.requirePostRight(author, channelId);
    const repeated = await this.repository.findByNonce(channelId, author.id, draft.clientNonce);
    if (repeated) {
      const isSameRequest = repeated.requestDigest === draft.requestDigest;
      if (!isSameRequest) throw new ConflictException('Client nonce was used for another message');
      return { scheduled: repeated, announce: nothingToAnnounce };
    }

    requireRoomInSchedule(await this.repository.countOwn(channelId, author.id));
    const message = await this.composer.complete(author, channel, draft);
    const scheduled = await this.repository.insert({
      workspaceId: author.workspaceId,
      channelId,
      authorMemberId: author.id,
      contentMarkdown: message.content.markdown,
      replyToMessageId: message.replyToMessageId,
      quoteText: message.quoteText,
      sendAt,
      requestDigest: message.requestDigest,
      clientNonce: message.clientNonce,
    });
    const announce = await this.events.record(
      SCHEDULED_MESSAGES_CHANGED_EVENT,
      new ScheduledMessagesChangedEvent(author.profile.oidcUserId, author.workspaceId, channelId),
    );

    return { scheduled, announce };
  }
}
