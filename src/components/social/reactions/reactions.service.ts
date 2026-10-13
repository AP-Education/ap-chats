import { ConflictException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher';
import type { Announce } from '@/globals/publisher/types';

import { MessagesService } from '../messages';
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
  summary: ReactionSummary;
  announce: Announce;
}

@Injectable()
export class ReactionsService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly messages: MessagesService,
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
    await this.messages.requireLive(this.messageOf(member, channelId, messageId));

    return this.repository.reactors(messageId, { emoji, limit: LISTED_REACTORS });
  }

  async react(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<MessageReaction> {
    const message = this.messageOf(member, channelId, messageId);

    const { summary, announce } = await this.placeReaction(member, message, emoji);
    announce();

    return { ...summary, reacted: true };
  }

  async withdraw(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    emoji: string,
  ): Promise<MessageReaction> {
    const message = this.messageOf(member, channelId, messageId);

    const { summary, announce } = await this.withdrawReaction(member, message, emoji);
    announce();

    return { ...summary, reacted: false };
  }

  @Transactional()
  private async placeReaction(
    member: WorkspaceMember,
    message: ReactedMessage,
    emoji: string,
  ): Promise<ReactionChange> {
    await this.access.requireParticipant(member, message.channelId);
    await this.messages.requireLive(message);
    await this.requireRoomFor(message.messageId, emoji);

    const changed = await this.repository.add(message, emoji, member.id);
    const summary = await this.repository.summary(message.messageId, emoji);
    return { summary, announce: await this.announcement(member, message, summary, changed, true) };
  }

  @Transactional()
  private async withdrawReaction(
    member: WorkspaceMember,
    message: ReactedMessage,
    emoji: string,
  ): Promise<ReactionChange> {
    await this.access.requireParticipant(member, message.channelId);
    await this.messages.requireLive(message);

    const changed = await this.repository.remove(message.messageId, emoji, member.id);
    const summary = await this.repository.summary(message.messageId, emoji);
    return { summary, announce: await this.announcement(member, message, summary, changed, false) };
  }

  // Checked without a lock: two new emoji at the same instant can pass the limit by one, harmlessly.
  private async requireRoomFor(messageId: string, emoji: string) {
    const shown = await this.repository.emojisOn(messageId);
    const isNewEmoji = !shown.includes(emoji);
    const isFull = shown.length >= MAX_DISTINCT_EMOJIS;
    if (isNewEmoji && isFull)
      throw new ConflictException('This message has the most reactions it can hold');
  }

  private async announcement(
    member: WorkspaceMember,
    message: ReactedMessage,
    summary: ReactionSummary,
    changed: boolean,
    added: boolean,
  ): Promise<Announce> {
    if (!changed) return nothingToAnnounce;

    const event = new ReactionChangedEvent(
      message.workspaceId,
      message.channelId,
      message.messageId,
      member.id,
      added,
      summary,
    );
    return this.events.record(REACTION_CHANGED_EVENT, event);
  }

  private messageOf(member: WorkspaceMember, channelId: string, messageId: string): ReactedMessage {
    return { workspaceId: member.workspaceId, channelId, messageId };
  }
}
