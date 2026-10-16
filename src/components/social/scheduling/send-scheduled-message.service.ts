import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher';
import type { Announce } from '@/globals/publisher/types';

import { SendMessageService } from '../posting';
import {
  SCHEDULED_MESSAGES_CHANGED_EVENT,
  ScheduledMessagesChangedEvent,
} from './events/scheduled-messages-changed.event';
import { ScheduledMessagesRepository } from './repository';
import type { ScheduledMessageModel } from './types/scheduled-message.types';

/** A scheduled message leaves the schedule in the transaction that puts it in the history. */
@Injectable()
export class SendScheduledMessageService {
  constructor(
    private readonly repository: ScheduledMessagesRepository,
    private readonly members: WorkspaceMembersRepository,
    private readonly sending: SendMessageService,
    private readonly events: EventPublisher,
  ) {}

  /** Before its time, at the author's word; whatever the channel refuses, the author hears at once. */
  async sendNow(author: WorkspaceMember, channelId: string, id: string) {
    const { message, announce } = await this.publishNow(author, channelId, id);
    announce();

    return message;
  }

  /** At its time; one the channel no longer accepts stays, marked failed, for its author to see. */
  async sendOnTime(due: ScheduledMessageModel): Promise<void> {
    const author = await this.members.findById(due.workspaceId, due.authorMemberId);
    const announce = author
      ? await this.attempt(author, due)
      : await this.fail(due, 'The author has left the workspace');
    announce();
  }

  // Only a rule of the channel fails the message; any other error is for the next attempt.
  private async attempt(author: WorkspaceMember, due: ScheduledMessageModel): Promise<Announce> {
    try {
      return await this.publishDue(author, due.id);
    } catch (error) {
      if (!(error instanceof HttpException)) throw error;
      return this.fail(due, error.message, author);
    }
  }

  @Transactional()
  private async publishNow(author: WorkspaceMember, channelId: string, id: string) {
    const scheduled = await this.repository.lockOwn(channelId, author.id, id);
    if (!scheduled) throw new NotFoundException('Scheduled message not found');

    return this.publish(author, scheduled);
  }

  @Transactional()
  private async publishDue(author: WorkspaceMember, id: string): Promise<Announce> {
    // Gone, changed, or held by another instance: whoever has it decides.
    const scheduled = await this.repository.lockDue(id);
    if (!scheduled) return nothingToAnnounce;

    const { announce } = await this.publish(author, scheduled);
    return announce;
  }

  @Transactional()
  private async fail(
    due: ScheduledMessageModel,
    failure: string,
    author?: WorkspaceMember,
  ): Promise<Announce> {
    const scheduled = await this.repository.lockDue(due.id);
    if (!scheduled) return nothingToAnnounce;

    await this.repository.markFailed(scheduled.id, failure);
    return author ? this.announceChange(author, scheduled.channelId) : nothingToAnnounce;
  }

  private async publish(author: WorkspaceMember, scheduled: ScheduledMessageModel) {
    const { replyToMessageId, quoteText } = scheduled;
    const { message, announce: announceMessage } = await this.sending.sendWithin(
      author,
      scheduled.channelId,
      {
        markdown: scheduled.contentMarkdown,
        // Its own id, so it never meets a nonce the author's client picks for a message.
        clientNonce: scheduled.id,
        ...(replyToMessageId && { replyToMessageId }),
        ...(quoteText && { quoteText }),
      },
    );
    await this.repository.remove(scheduled.id);
    const announceSchedule = await this.announceChange(author, scheduled.channelId);

    const announce = () => {
      announceMessage();
      announceSchedule();
    };
    return { message, announce };
  }

  private announceChange(author: WorkspaceMember, channelId: string) {
    return this.events.record(
      SCHEDULED_MESSAGES_CHANGED_EVENT,
      new ScheduledMessagesChangedEvent(author.profile.oidcUserId, author.workspaceId, channelId),
    );
  }
}
