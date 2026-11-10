import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher';

import { MessageMarkdownService } from '../content';
import type { ChangeScheduledMessageDto } from './dto/scheduled-message.dto';
import {
  SCHEDULED_MESSAGES_CHANGED_EVENT,
  ScheduledMessagesChangedEvent,
} from './events/scheduled-messages-changed.event';
import { ScheduledMessagesRepository } from './repository';
import { requireSendTime } from './scheduled-message.rules';
import { scheduledMessageView } from './scheduled-message-view';

/** What the author does with their own schedule; nobody else sees it. */
@Injectable()
export class ScheduledMessagesService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly markdown: MessageMarkdownService,
    private readonly repository: ScheduledMessagesRepository,
    private readonly events: EventPublisher,
  ) {}

  @Transactional()
  async list(author: WorkspaceMember, channelId: string) {
    await this.access.requireViewAccess(author, channelId);
    const scheduled = await this.repository.listOwn(channelId, author.id);

    return scheduled.map(scheduledMessageView);
  }

  async change(
    author: WorkspaceMember,
    channelId: string,
    id: string,
    request: ChangeScheduledMessageDto,
  ) {
    const { sendAt } = request;
    if (sendAt) requireSendTime(sendAt);

    const { scheduled, announce } = await this.revise(author, channelId, id, request);
    announce();

    return scheduledMessageView(scheduled);
  }

  async cancel(author: WorkspaceMember, channelId: string, id: string): Promise<void> {
    const announce = await this.remove(author, channelId, id);
    announce();
  }

  @Transactional()
  private async revise(
    author: WorkspaceMember,
    channelId: string,
    id: string,
    request: ChangeScheduledMessageDto,
  ) {
    await this.access.requirePostRight(author, channelId);
    const scheduled = await this.requireOwn(author, channelId, id);
    const { markdown, sendAt, revision } = request;

    const isStale = revision !== undefined && revision !== scheduled.revision;
    if (isStale) throw new ConflictException('Scheduled message was changed');

    const hasAttachments = scheduled.attachments.length > 0;
    const content =
      markdown === undefined ? null : await this.markdown.normalize(markdown, hasAttachments);
    const revised = await this.repository.update(
      id,
      {
        ...(content && { contentMarkdown: content.markdown }),
        ...(sendAt && { sendAt, failure: null }),
      },
      scheduled.revision + 1,
    );

    return { scheduled: revised, announce: await this.announceChange(author, channelId) };
  }

  @Transactional()
  private async remove(author: WorkspaceMember, channelId: string, id: string) {
    await this.requireOwn(author, channelId, id);
    await this.repository.remove(id);

    return this.announceChange(author, channelId);
  }

  // Gone also when it has just been sent: the author finds it in the history instead.
  private async requireOwn(author: WorkspaceMember, channelId: string, id: string) {
    const scheduled = await this.repository.lockOwn(channelId, author.id, id);
    if (!scheduled) throw new NotFoundException('Scheduled message not found');

    return scheduled;
  }

  private announceChange(author: WorkspaceMember, channelId: string) {
    return this.events.record(
      SCHEDULED_MESSAGES_CHANGED_EVENT,
      new ScheduledMessagesChangedEvent(author.profile.oidcUserId, author.workspaceId, channelId),
    );
  }
}
