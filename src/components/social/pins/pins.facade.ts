import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher/event-publisher';

import { PIN_ADDED_EVENT, PinAddedEvent } from './events/pin-added.event';
import { PIN_REMOVED_EVENT, PinRemovedEvent } from './events/pin-removed.event';
import { PinsRepository } from './repository/pins.repository';

@Injectable()
export class PinsFacade {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly repository: PinsRepository,
    private readonly events: EventPublisher,
  ) {}

  @Transactional()
  async list(member: WorkspaceMember, channelId: string) {
    await this.access.requireReadAccess(member, channelId);
    return this.repository.list(channelId);
  }

  removeForMessages(ids: string[]) {
    return this.repository.removeForMessages(ids);
  }

  async add(member: WorkspaceMember, channelId: string, messageId: string) {
    const result = await this.addTransaction(member, channelId, messageId);
    if (result.created)
      this.events.publish(
        PIN_ADDED_EVENT,
        new PinAddedEvent(member.workspaceId, channelId, messageId, member.id),
      );
    return result.pin;
  }

  @Transactional()
  private async addTransaction(member: WorkspaceMember, channelId: string, messageId: string) {
    const channel = await this.access.requirePostAccess(member, channelId);
    if (channel.kind !== 'dm') this.access.requireManager(member, channel);
    if (!(await this.repository.messageIsAvailable(member.workspaceId, channelId, messageId)))
      throw new NotFoundException('Message not found');
    const existing = await this.repository.find(channelId, messageId);
    if (existing) return { pin: existing, created: false };
    return {
      pin: await this.repository.insert(member.workspaceId, channelId, messageId, member.id),
      created: true,
    };
  }

  async remove(member: WorkspaceMember, channelId: string, messageId: string) {
    const deleted = await this.removeTransaction(member, channelId, messageId);
    if (deleted)
      this.events.publish(
        PIN_REMOVED_EVENT,
        new PinRemovedEvent(member.workspaceId, channelId, messageId, member.id),
      );
  }

  @Transactional()
  private async removeTransaction(member: WorkspaceMember, channelId: string, messageId: string) {
    const channel = await this.access.requirePostAccess(member, channelId);
    if (channel.kind !== 'dm') this.access.requireManager(member, channel);
    return this.repository.remove(channelId, messageId);
  }
}
