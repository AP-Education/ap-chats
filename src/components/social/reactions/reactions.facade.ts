import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher/event-publisher';

import { REACTION_ADDED_EVENT, ReactionAddedEvent } from './events/reaction-added.event';
import { REACTION_REMOVED_EVENT, ReactionRemovedEvent } from './events/reaction-removed.event';
import { isReactionEmoji, MAX_DISTINCT_REACTIONS } from './reaction-emoji';
import { ReactionsRepository } from './repository/reactions.repository';
import type { MessageReaction } from './types/reaction.types';

const REACTORS_LIMIT = 100;

@Injectable()
export class ReactionsFacade {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly repository: ReactionsRepository,
    private readonly events: EventPublisher,
  ) {}

  @Transactional()
  async reactors(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    emoji: string | undefined,
  ) {
    if (emoji !== undefined) this.requireEmoji(emoji);
    await this.access.requireViewAccess(member, channelId);
    await this.requireMessage(member, channelId, messageId);
    return this.repository.reactors(messageId, emoji, REACTORS_LIMIT);
  }

  async add(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<MessageReaction> {
    this.requireEmoji(emoji);
    const { added, state } = await this.addTransaction(member, channelId, messageId, emoji);
    if (added)
      this.events.publish(
        REACTION_ADDED_EVENT,
        new ReactionAddedEvent(
          member.workspaceId,
          channelId,
          messageId,
          member.id,
          emoji,
          state.count,
          state.recentMemberIds,
        ),
      );
    return { ...state, reacted: true };
  }

  @Transactional()
  private async addTransaction(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    emoji: string,
  ) {
    await this.access.requirePostAccess(member, channelId);
    await this.requireMessage(member, channelId, messageId);
    const emojis = await this.repository.emojis(messageId);
    if (!emojis.includes(emoji) && emojis.length >= MAX_DISTINCT_REACTIONS)
      throw new ConflictException('This message has the most reactions it can hold');
    const added = await this.repository.insert(
      member.workspaceId,
      channelId,
      messageId,
      emoji,
      member.id,
    );
    return { added, state: await this.repository.state(messageId, emoji) };
  }

  async remove(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<MessageReaction> {
    this.requireEmoji(emoji);
    const { removed, state } = await this.removeTransaction(member, channelId, messageId, emoji);
    if (removed)
      this.events.publish(
        REACTION_REMOVED_EVENT,
        new ReactionRemovedEvent(
          member.workspaceId,
          channelId,
          messageId,
          member.id,
          emoji,
          state.count,
          state.recentMemberIds,
        ),
      );
    return { ...state, reacted: false };
  }

  @Transactional()
  private async removeTransaction(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    emoji: string,
  ) {
    await this.access.requirePostAccess(member, channelId);
    await this.requireMessage(member, channelId, messageId);
    const removed = await this.repository.remove(messageId, emoji, member.id);
    return { removed, state: await this.repository.state(messageId, emoji) };
  }

  private requireEmoji(emoji: string) {
    if (!isReactionEmoji(emoji)) throw new BadRequestException('Unsupported reaction');
  }

  private async requireMessage(member: WorkspaceMember, channelId: string, messageId: string) {
    if (!(await this.repository.messageIsAvailable(member.workspaceId, channelId, messageId)))
      throw new NotFoundException('Message not found');
  }
}
