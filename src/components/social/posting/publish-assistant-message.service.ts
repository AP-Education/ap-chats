import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher';

import { MessagesService } from '../messages';
import {
  MESSAGE_CREATED_EVENT,
  MessageCreatedEvent,
} from '../messages/events/message-created.event';

@Injectable()
export class PublishAssistantMessageService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly messages: MessagesService,
    private readonly events: EventPublisher,
  ) {}

  async publish(actor: WorkspaceMember, channelId: string, messageId: string) {
    const { message, announce } = await this.convert(actor, channelId, messageId);
    announce();
    return message;
  }

  @Transactional()
  private async convert(actor: WorkspaceMember, channelId: string, messageId: string) {
    const channel = await this.access.requirePostAccess(actor, channelId);
    const { message, changed } = await this.messages.makeOwn(actor, channel, messageId);
    const announce = changed
      ? await this.events.record(
          MESSAGE_CREATED_EVENT,
          new MessageCreatedEvent(actor.workspaceId, channelId, message.id, message.seq, actor.id),
          { durable: true },
        )
      : nothingToAnnounce;
    return { message, announce };
  }
}
