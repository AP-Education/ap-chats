import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher';

import { MessagesService } from '../messages';
import type { MessageRef } from '../messages/types/message.types';
import { PIN_ADDED_EVENT, PinAddedEvent } from './events/pin-added.event';
import { PIN_REMOVED_EVENT, PinRemovedEvent } from './events/pin-removed.event';
import { PinsRepository } from './repository/pins.repository';

@Injectable()
export class PinsService {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly messages: MessagesService,
    private readonly repository: PinsRepository,
    private readonly events: EventPublisher,
  ) {}

  @Transactional()
  async list(member: WorkspaceMember, channelId: string) {
    await this.access.requireReadAccess(member, channelId);
    return this.repository.list(channelId);
  }

  async add(member: WorkspaceMember, channelId: string, messageId: string) {
    const message = { workspaceId: member.workspaceId, channelId, messageId };

    const { pin, announce } = await this.pin(member, message);
    announce();

    return pin;
  }

  async remove(member: WorkspaceMember, channelId: string, messageId: string): Promise<void> {
    const message = { workspaceId: member.workspaceId, channelId, messageId };

    const announce = await this.unpin(member, message);
    announce();
  }

  /** Inside the transaction that deletes the messages. */
  removeForMessages(ids: string[]): Promise<void> {
    return this.repository.removeForMessages(ids);
  }

  @Transactional()
  private async pin(member: WorkspaceMember, message: MessageRef) {
    await this.requirePinner(member, message.channelId);
    await this.messages.requireLive(message);

    const existing = await this.repository.find(message.channelId, message.messageId);
    if (existing) return { pin: existing, announce: nothingToAnnounce };

    const pin = await this.repository.insert(
      message.workspaceId,
      message.channelId,
      message.messageId,
      member.id,
    );
    const { workspaceId, channelId, messageId } = message;
    const announce = await this.events.record(
      PIN_ADDED_EVENT,
      new PinAddedEvent(workspaceId, channelId, messageId, member.id),
    );
    return { pin, announce };
  }

  @Transactional()
  private async unpin(member: WorkspaceMember, message: MessageRef) {
    await this.requirePinner(member, message.channelId);

    const wasPinned = await this.repository.remove(message.channelId, message.messageId);
    if (!wasPinned) return nothingToAnnounce;

    const { workspaceId, channelId, messageId } = message;
    return this.events.record(
      PIN_REMOVED_EVENT,
      new PinRemovedEvent(workspaceId, channelId, messageId, member.id),
    );
  }

  private async requirePinner(member: WorkspaceMember, channelId: string): Promise<void> {
    const channel = await this.access.requirePostAccess(member, channelId);
    if (channel.kind !== 'dm') this.access.requireManager(member, channel);
  }
}
