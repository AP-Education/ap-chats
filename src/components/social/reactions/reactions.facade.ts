import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher/event-publisher';

import { REACTION_CHANGED_EVENT, ReactionChangedEvent } from './events/reaction-changed.event';
import { ReactionsRepository } from './repository/reactions.repository';
import type {
  MessageReaction,
  ReactedMessage,
  ReactionSummary,
  Reactor,
} from './types/reaction.types';

const MAX_DISTINCT_EMOJIS = 20;
const LISTED_REACTORS = 100;

interface ReactionChange {
  changed: boolean;
  summary: ReactionSummary;
}

@Injectable()
export class ReactionsFacade {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly repository: ReactionsRepository,
    private readonly events: EventPublisher,
  ) {}

  @Transactional()
  async whoReacted(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    emoji: string | undefined,
  ): Promise<Reactor[]> {
    await this.access.requireViewAccess(member, channelId);
    await this.requireLiveMessage(this.messageOf(member, channelId, messageId));

    return this.repository.reactors(messageId, { emoji, limit: LISTED_REACTORS });
  }

  async react(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<MessageReaction> {
    const message = this.messageOf(member, channelId, messageId);
    const { changed, summary } = await this.placeReaction(member, message, emoji);

    if (changed) this.announce(member, message, summary, true);
    return { ...summary, reacted: true };
  }

  async withdraw(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<MessageReaction> {
    const message = this.messageOf(member, channelId, messageId);
    const { changed, summary } = await this.withdrawReaction(member, message, emoji);

    if (changed) this.announce(member, message, summary, false);
    return { ...summary, reacted: false };
  }

  @Transactional()
  private async placeReaction(
    member: WorkspaceMember,
    message: ReactedMessage,
    emoji: string,
  ): Promise<ReactionChange> {
    await this.access.requirePostAccess(member, message.channelId);
    await this.requireLiveMessage(message);
    await this.requireRoomFor(message.messageId, emoji);

    const changed = await this.repository.add(message, emoji, member.id);
    const summary = await this.repository.summary(message.messageId, emoji);
    return { changed, summary };
  }

  @Transactional()
  private async withdrawReaction(
    member: WorkspaceMember,
    message: ReactedMessage,
    emoji: string,
  ): Promise<ReactionChange> {
    await this.access.requirePostAccess(member, message.channelId);
    await this.requireLiveMessage(message);

    const changed = await this.repository.remove(message.messageId, emoji, member.id);
    const summary = await this.repository.summary(message.messageId, emoji);
    return { changed, summary };
  }

  private async requireLiveMessage(message: ReactedMessage) {
    const isLive = await this.repository.isLiveMessage(message);
    if (!isLive) throw new NotFoundException('Message not found');
  }

  private async requireRoomFor(messageId: string, emoji: string) {
    const shown = await this.repository.emojisOn(messageId);
    const isNewEmoji = !shown.includes(emoji);
    const isFull = shown.length >= MAX_DISTINCT_EMOJIS;
    if (isNewEmoji && isFull)
      throw new ConflictException('This message has the most reactions it can hold');
  }

  private announce(
    member: WorkspaceMember,
    message: ReactedMessage,
    summary: ReactionSummary,
    added: boolean,
  ) {
    const event = new ReactionChangedEvent(
      message.workspaceId,
      message.channelId,
      message.messageId,
      member.id,
      added,
      summary,
    );
    this.events.publish(REACTION_CHANGED_EVENT, event);
  }

  private messageOf(member: WorkspaceMember, channelId: string, messageId: string): ReactedMessage {
    return { workspaceId: member.workspaceId, channelId, messageId };
  }
}
