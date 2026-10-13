import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import { DirectConversationsService } from '@/components/direct-messages/conversations';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher';

import { MessagesService } from '../messages';
import type { MessageView } from '../messages/message-view';
import type { ForwardMessagesDto } from './dto/forward-messages.dto';
import {
  FORWARD_BATCH_CREATED_EVENT,
  ForwardBatchCreatedEvent,
} from './events/forward-batch-created.event';

@Injectable()
export class ForwardingService {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly conversations: DirectConversationsService,
    private readonly messages: MessagesService,
    private readonly events: EventPublisher,
  ) {}

  async forward(member: WorkspaceMember, dto: ForwardMessagesDto) {
    const { messages, conversation, announce } = await this.copy(member, dto);
    announce();

    return { messages, conversation };
  }

  // Opening the DM belongs to the forward: if the copy fails, no empty conversation is left behind.
  @Transactional()
  private async copy(member: WorkspaceMember, dto: ForwardMessagesDto) {
    const conversation =
      dto.target.kind === 'member'
        ? await this.conversations.findOrCreate(member, dto.target.id)
        : null;
    const targetChannelId = conversation?.id ?? dto.target.id;
    await this.access.requireForwardAccess(member, dto.sourceChannelId, targetChannelId);

    const request = {
      clientNonces: dto.messageIds.map((_, index) => batchNonce(dto.batchNonce, index)),
      requestDigest: digest({
        source: dto.sourceChannelId,
        target: targetChannelId,
        ids: dto.messageIds,
      }),
    };
    const repeated = await this.messages.findRepeatedBatch(member, targetChannelId, request);
    if (repeated) return { messages: repeated, conversation, announce: nothingToAnnounce };

    const sources = await this.messages.requireLiveMany(dto.sourceChannelId, dto.messageIds);
    const copies = sources.map((source, index) => ({
      sourceMessageId: source.id,
      sourceAuthorMemberId: source.authorMemberId,
      contentMarkdown: source.contentMarkdown,
      attachments: source.attachments,
      clientNonce: request.clientNonces[index]!,
    }));
    const messages = await this.messages.postForwarded(member, targetChannelId, {
      copies,
      requestDigest: request.requestDigest,
    });
    const announce = await this.recordBatch(member, targetChannelId, messages);

    return { messages, conversation, announce };
  }

  private recordBatch(member: WorkspaceMember, channelId: string, messages: MessageView[]) {
    const seqs = messages.map(({ seq }) => seq);
    const event = new ForwardBatchCreatedEvent(
      member.workspaceId,
      channelId,
      messages.map(({ id }) => id),
      seqs[0]!,
      seqs.at(-1)!,
      member.id,
      seqs,
    );
    return this.events.record(FORWARD_BATCH_CREATED_EVENT, event, { durable: true });
  }
}

function digest(request: object): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
}

/** Each forwarded copy gets a stable UUID-shaped nonce derived from the batch's own. */
function batchNonce(batch: string, index: number): string {
  const hex = createHash('sha256').update(`${batch}:${index}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
