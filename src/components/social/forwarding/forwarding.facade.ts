import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher/event-publisher';

import { messageView } from '../messages/message-view';
import { MessagesFacade } from '../messages/messages.facade';
import type { ForwardMessagesDto } from './dto/forward-messages.dto';
import {
  FORWARD_BATCH_CREATED_EVENT,
  ForwardBatchCreatedEvent,
} from './events/forward-batch-created.event';
import { ForwardingRepository } from './repository/forwarding.repository';

@Injectable()
export class ForwardingFacade {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly messages: MessagesFacade,
    private readonly repository: ForwardingRepository,
    private readonly events: EventPublisher,
  ) {}

  async forward(member: WorkspaceMember, targetChannelId: string, dto: ForwardMessagesDto) {
    if (
      !Array.isArray(dto.messageIds) ||
      dto.messageIds.length < 1 ||
      dto.messageIds.length > 100 ||
      new Set(dto.messageIds).size !== dto.messageIds.length
    )
      throw new BadRequestException('Provide 1 to 100 distinct message IDs');
    const digest = createHash('sha256')
      .update(
        JSON.stringify({
          source: dto.sourceChannelId,
          target: targetChannelId,
          ids: dto.messageIds,
        }),
      )
      .digest('hex');
    const nonces = dto.messageIds.map((_, index) => this.nonce(dto.batchNonce, index));
    const result = await this.forwardTransaction(member, targetChannelId, dto, digest, nonces);
    if (result.created)
      this.events.publish(
        FORWARD_BATCH_CREATED_EVENT,
        new ForwardBatchCreatedEvent(
          member.workspaceId,
          targetChannelId,
          result.views.map(({ id }) => id),
          result.views[0]!.seq,
          result.views.at(-1)!.seq,
          member.id,
        ),
      );
    return { messages: result.views };
  }

  @Transactional()
  private async forwardTransaction(
    member: WorkspaceMember,
    targetChannelId: string,
    dto: ForwardMessagesDto,
    digest: string,
    nonces: string[],
  ) {
    await this.access.requireForwardAccess(member, dto.sourceChannelId, targetChannelId);
    const existing = await this.repository.findByNonces(targetChannelId, member.id, nonces);
    if (existing.length) {
      if (
        existing.length !== nonces.length ||
        existing.some(({ message }) => message.requestDigest !== digest)
      )
        throw new ConflictException('Batch nonce was used for another forward');
      const byNonce = new Map(
        existing.map(({ message, seq }) => [
          message.clientNonce,
          messageView(message, seq, member.id),
        ]),
      );
      return {
        views: nonces.map((nonce) => {
          const view = byNonce.get(nonce);
          if (!view) throw new ConflictException('Incomplete forward batch');
          return view;
        }),
        created: false,
      };
    }
    const sources = await this.messages.findMany(dto.sourceChannelId, dto.messageIds);
    if (sources.length !== dto.messageIds.length || sources.some((message) => message.deletedAt))
      throw new NotFoundException('Source message not found');
    const byId = new Map(sources.map((message) => [message.id, message]));
    const forwardRecords = dto.messageIds.map((id, index) => {
      const source = byId.get(id);
      if (!source) throw new Error('Source message missing');
      return {
        sourceMessageId: source.id,
        sourceAuthorMemberId: source.authorMemberId,
        contentMarkdown: source.contentMarkdown,
        clientNonce: nonces[index]!,
      };
    });
    const views = await this.messages.insertForwardBatch(
      member,
      targetChannelId,
      forwardRecords,
      digest,
    );
    return { views, created: true };
  }

  private nonce(batchNonce: string, index: number) {
    const hex = createHash('sha256').update(`${batchNonce}:${index}`).digest('hex').slice(0, 32);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  }
}
