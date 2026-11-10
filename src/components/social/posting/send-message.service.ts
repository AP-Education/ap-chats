import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher';
import type { Announce } from '@/globals/publisher/types';

import { MessagesService } from '../messages';
import {
  MESSAGE_CREATED_EVENT,
  MessageCreatedEvent,
  PRIVATE_MESSAGE_CREATED_EVENT,
} from '../messages/events/message-created.event';
import type { MessageView } from '../messages/message-view';
import type { Attachment } from '../messages/types/message.types';
import type { SendMessageDto } from './dto/send-message.dto';
import { MessageComposer } from './message-composer';
import type { MessageDraft } from './types';

@Injectable()
export class SendMessageService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly composer: MessageComposer,
    private readonly messages: MessagesService,
    private readonly events: EventPublisher,
  ) {}

  /**
   * Posts on `authority`'s right to post, the author's own unless given. Tech debt: a bot answering
   * a question posts on the asker's right rather than its own channel grants; drop the parameter
   * once bots hold grants.
   */
  async send(
    author: WorkspaceMember,
    channelId: string,
    request: SendMessageDto,
    authority: WorkspaceMember = author,
  ) {
    const draft = await this.composer.draft(request);

    const { message, announce } = await this.post(author, authority, channelId, draft);
    announce();

    return message;
  }

  /** Joins the caller's transaction, so its own change commits with the message; it announces after. */
  async sendWithin(
    author: WorkspaceMember,
    channelId: string,
    request: Omit<SendMessageDto, 'attachments'>,
    claimedAttachments: Attachment[],
  ) {
    const attachments = claimedAttachments.map(({ id, description }) => ({
      id,
      ...(description !== null && { description }),
    }));
    const draft = await this.composer.draft({ ...request, attachments });

    return this.post(author, author, channelId, draft, claimedAttachments);
  }

  // A retry of a request that already went through gets the same message back, announced once.
  @Transactional()
  private async post(
    author: WorkspaceMember,
    authority: WorkspaceMember,
    channelId: string,
    draft: MessageDraft,
    claimedAttachments?: Attachment[],
  ): Promise<{ message: MessageView; announce: Announce }> {
    const channel = await this.access.requirePostAccess(authority, channelId);
    const repeated = await this.messages.findRepeat(author, channelId, draft);
    if (repeated) return { message: repeated, announce: nothingToAnnounce };

    const message = await this.messages.post(
      author,
      channel,
      await this.composer.complete(author, channel, draft, authority, claimedAttachments),
      authority,
    );
    const announce = await this.events.record(
      message.privateToMe ? PRIVATE_MESSAGE_CREATED_EVENT : MESSAGE_CREATED_EVENT,
      new MessageCreatedEvent(
        author.workspaceId,
        channelId,
        message.id,
        message.seq,
        author.id,
        message.privateToMe ? authority.profile.oidcUserId : undefined,
      ),
      { durable: true },
    );

    return { message, announce };
  }
}
