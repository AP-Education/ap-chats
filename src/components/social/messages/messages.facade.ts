import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher/event-publisher';

import { EntriesFacade } from '../entries/entries.facade';
import { MentionsFacade } from '../mentions/mentions.facade';
import { PinsFacade } from '../pins/pins.facade';
import { MessageMarkdownService, type NormalizedMessageContent } from './content/message-markdown';
import type {
  BatchDeleteMessagesDto,
  EditMessageDto,
  SendMessageDto,
} from './dto/send-message.dto';
import { MESSAGE_CREATED_EVENT, MessageCreatedEvent } from './events/message-created.event';
import { MESSAGE_DELETED_EVENT, MessageDeletedEvent } from './events/message-deleted.event';
import { MESSAGE_UPDATED_EVENT, MessageUpdatedEvent } from './events/message-updated.event';
import {
  MESSAGES_BATCH_DELETED_EVENT,
  MessagesBatchDeletedEvent,
} from './events/messages-batch-deleted.event';
import { messageView } from './message-view';
import { MessagesRepository } from './repository/messages.repository';
import type { ForwardMessageRecord, MessageModel } from './types/message.types';

@Injectable()
export class MessagesFacade {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly entries: EntriesFacade,
    private readonly pins: PinsFacade,
    private readonly mentions: MentionsFacade,
    private readonly repository: MessagesRepository,
    private readonly markdown: MessageMarkdownService,
    private readonly events: EventPublisher,
  ) {}

  async send(member: WorkspaceMember, channelId: string, dto: SendMessageDto) {
    const content = await this.markdown.normalize(dto.markdown);
    const quote = dto.quoteText?.trim() || null;
    if (quote && !dto.replyToMessageId)
      throw new BadRequestException('Quote requires a reply target');
    const digest = createHash('sha256')
      .update(
        JSON.stringify({ markdown: content.markdown, reply: dto.replyToMessageId ?? null, quote }),
      )
      .digest('hex');
    const result = await this.createTransaction(member, channelId, dto, content, quote, digest);
    if (result.created)
      this.events.publish(
        MESSAGE_CREATED_EVENT,
        new MessageCreatedEvent(
          member.workspaceId,
          channelId,
          result.view.id,
          result.view.seq,
          member.id,
        ),
      );
    return result.view;
  }

  @Transactional()
  private async createTransaction(
    member: WorkspaceMember,
    channelId: string,
    dto: SendMessageDto,
    content: NormalizedMessageContent,
    quote: string | null,
    digest: string,
  ) {
    await this.access.requirePostAccess(member, channelId);
    const existing = await this.repository.findByNonce(channelId, member.id, dto.clientNonce);
    if (existing) {
      if (existing.requestDigest !== digest)
        throw new ConflictException('Client nonce was used for another message');
      return {
        view: messageView(existing, await this.repository.entrySeq(existing.id), member.id),
        created: false,
      };
    }
    if (dto.replyToMessageId) {
      const source = await this.requireMessage(member.workspaceId, channelId, dto.replyToMessageId);
      if (source.deletedAt) throw new NotFoundException('Reply target not found');
      if (
        quote &&
        !this.quoteMatches((await this.markdown.normalize(source.contentMarkdown)).plainText, quote)
      )
        throw new BadRequestException('Quote is not in the reply target');
    }
    await this.mentions.requireValid(member.workspaceId, channelId, content.mentionedMemberIds);
    const message = await this.repository.insert({
      workspaceId: member.workspaceId,
      channelId,
      authorMemberId: member.id,
      contentMarkdown: content.markdown,
      replyToMessageId: dto.replyToMessageId ?? null,
      quoteText: quote,
      requestDigest: digest,
      clientNonce: dto.clientNonce,
    });
    const entry = await this.entries.append(member.workspaceId, channelId, message.id);
    await this.mentions.replace(
      member.workspaceId,
      channelId,
      message.id,
      content.mentionedMemberIds,
    );
    return { view: messageView(message, entry.seq, member.id), created: true };
  }

  async edit(member: WorkspaceMember, channelId: string, messageId: string, dto: EditMessageDto) {
    const content = await this.markdown.normalize(dto.markdown);
    const view = await this.editTransaction(member, channelId, messageId, dto, content);
    this.events.publish(
      MESSAGE_UPDATED_EVENT,
      new MessageUpdatedEvent(member.workspaceId, channelId, messageId, view.seq, member.id),
    );
    return view;
  }

  @Transactional()
  private async editTransaction(
    member: WorkspaceMember,
    channelId: string,
    messageId: string,
    dto: EditMessageDto,
    content: NormalizedMessageContent,
  ) {
    await this.access.requirePostAccess(member, channelId);
    const message = await this.requireMessage(member.workspaceId, channelId, messageId);
    if (message.authorMemberId !== member.id)
      throw new ForbiddenException('Only the author can edit this message');
    if (message.deletedAt) throw new ConflictException('Message was deleted');
    if (dto.revision !== undefined && dto.revision !== message.revision)
      throw new ConflictException('Message was changed');
    await this.mentions.requireValid(member.workspaceId, channelId, content.mentionedMemberIds);
    const updated = await this.repository.updateContent(
      messageId,
      content.markdown,
      message.revision + 1,
    );
    await this.mentions.replace(
      member.workspaceId,
      channelId,
      messageId,
      content.mentionedMemberIds,
    );
    return messageView(updated, await this.repository.entrySeq(messageId), member.id);
  }

  async deleteBatch(member: WorkspaceMember, channelId: string, dto: BatchDeleteMessagesDto) {
    const ids = dto.messageIds;
    if (
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 100 ||
      new Set(ids).size !== ids.length
    )
      throw new BadRequestException('Provide 1 to 100 distinct message IDs');
    const changed = await this.deleteTransaction(member, channelId, ids);
    if (changed.length === 1) {
      const item = changed[0]!;
      this.events.publish(
        MESSAGE_DELETED_EVENT,
        new MessageDeletedEvent(member.workspaceId, channelId, item.id, item.seq, member.id),
      );
    } else if (changed.length > 1) {
      this.events.publish(
        MESSAGES_BATCH_DELETED_EVENT,
        new MessagesBatchDeletedEvent(
          member.workspaceId,
          channelId,
          changed.map(({ id }) => id),
          member.id,
        ),
      );
    }
    return { deletedMessageIds: changed.map((item) => item.id) };
  }

  @Transactional()
  private async deleteTransaction(member: WorkspaceMember, channelId: string, ids: string[]) {
    const channel = await this.access.requirePostAccess(member, channelId);
    const rows = await this.repository.findWithEntries(channelId, ids);
    if (rows.length !== ids.length) throw new NotFoundException('Message not found');
    const manager =
      channel.kind === 'private' ||
      member.role === 'owner' ||
      channel.createdByMemberId === member.id;
    if (rows.some(({ message }) => message.authorMemberId !== member.id && !manager))
      throw new ForbiddenException('Cannot delete another member’s message');
    const pending = rows.filter(({ message }) => !message.deletedAt);
    await this.repository.tombstone(pending.map(({ message }) => message.id));
    await this.mentions.removeForMessages(pending.map(({ message }) => message.id));
    await this.pins.removeForMessages(pending.map(({ message }) => message.id));
    return pending.map(({ message, seq }) => ({ id: message.id, seq: seq.toString() }));
  }

  findMany(channelId: string, ids: string[]) {
    return this.repository.findMany(channelId, ids);
  }
  findWithEntries(channelId: string, ids: string[]) {
    return this.repository.findWithEntries(channelId, ids);
  }

  async requireMessage(workspaceId: string, channelId: string, id: string): Promise<MessageModel> {
    const message = await this.repository.findById(workspaceId, channelId, id);
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  private quoteMatches(source: string, selection: string): boolean {
    const compact = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();
    return compact(source).includes(compact(selection));
  }

  async insertForwardBatch(
    member: WorkspaceMember,
    channelId: string,
    sources: ForwardMessageRecord[],
    requestDigest: string,
  ) {
    const inserted = await this.repository.insertForwardBatch(
      member.workspaceId,
      channelId,
      member.id,
      sources,
      requestDigest,
    );
    if (inserted.length !== sources.length) throw new Error('Forward batch insert incomplete');
    const positions = await this.entries.appendMany(
      member.workspaceId,
      channelId,
      inserted.map(({ id }) => id),
    );
    const byId = new Map(inserted.map((message) => [message.id, message]));
    return positions.map(({ messageId, seq }) => {
      const message = byId.get(messageId);
      if (!message) throw new Error('Forward batch message missing');
      return messageView(message, seq, member.id);
    });
  }
}
