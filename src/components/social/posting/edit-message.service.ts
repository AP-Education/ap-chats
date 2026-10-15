import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher';

import { MessageMarkdownService } from '../content';
import type { MessageGif } from '../content/message-gif';
import type { NormalizedMessageContent } from '../content/message-markdown';
import { MessagesService } from '../messages';
import {
  MESSAGE_UPDATED_EVENT,
  MessageUpdatedEvent,
} from '../messages/events/message-updated.event';
import type { EditMessageDto } from './dto/send-message.dto';
import { requestedGif } from './requested-gif';

@Injectable()
export class EditMessageService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly markdown: MessageMarkdownService,
    private readonly messages: MessagesService,
    private readonly events: EventPublisher,
  ) {}

  async edit(
    author: WorkspaceMember,
    channelId: string,
    messageId: string,
    request: EditMessageDto,
  ) {
    // Blank text is fine here: whether the message keeps its files is known only under the lock.
    const content = await this.markdown.normalize(request.markdown, true);

    const { message, announce } = await this.revise(author, channelId, messageId, {
      content,
      gif: requestedGif(request.blocks),
      expectedRevision: request.revision,
    });
    announce();

    return message;
  }

  @Transactional()
  private async revise(
    author: WorkspaceMember,
    channelId: string,
    messageId: string,
    change: {
      content: NormalizedMessageContent;
      gif: MessageGif | undefined;
      expectedRevision: number | undefined;
    },
  ) {
    const channel = await this.access.requirePostAccess(author, channelId);
    const message = await this.messages.revise(author, channel, messageId, change);
    const announce = await this.events.record(
      MESSAGE_UPDATED_EVENT,
      new MessageUpdatedEvent(author.workspaceId, channelId, messageId, message.seq, author.id),
    );

    return { message, announce };
  }
}
