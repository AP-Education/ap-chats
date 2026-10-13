import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher';
import type { Announce } from '@/globals/publisher/types';

import { MessagesService } from '../messages';
import {
  MESSAGE_DELETED_EVENT,
  MessageDeletedEvent,
} from '../messages/events/message-deleted.event';
import {
  MESSAGES_BATCH_DELETED_EVENT,
  MessagesBatchDeletedEvent,
} from '../messages/events/messages-batch-deleted.event';
import type { DeletedMessage } from '../messages/types/message.types';
import { PinsService } from '../pins';

@Injectable()
export class DeleteMessagesService {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly messages: MessagesService,
    private readonly pins: PinsService,
    private readonly events: EventPublisher,
  ) {}

  async delete(actor: WorkspaceMember, channelId: string, messageIds: string[]) {
    const { deleted, announce } = await this.remove(actor, channelId, messageIds);
    announce();

    return { deletedMessageIds: deleted.map(({ id }) => id) };
  }

  @Transactional()
  private async remove(actor: WorkspaceMember, channelId: string, ids: string[]) {
    const channel = await this.access.requirePostAccess(actor, channelId);
    const moderates = this.access.moderates(actor, channel);

    const deleted = await this.messages.remove(actor, channelId, { ids, moderates });
    await this.pins.removeForMessages(deleted.map(({ id }) => id));

    return { deleted, announce: await this.recordDeletion(actor, channelId, deleted) };
  }

  // One message keeps its own event; several share one, so clients refetch once.
  private recordDeletion(
    actor: WorkspaceMember,
    channelId: string,
    deleted: DeletedMessage[],
  ): Promise<Announce> {
    const [only] = deleted;
    if (!only) return Promise.resolve(nothingToAnnounce);

    if (deleted.length === 1)
      return this.events.record(
        MESSAGE_DELETED_EVENT,
        new MessageDeletedEvent(
          actor.workspaceId,
          channelId,
          only.id,
          only.seq,
          actor.id,
          only.authorMemberId,
        ),
      );

    return this.events.record(
      MESSAGES_BATCH_DELETED_EVENT,
      new MessagesBatchDeletedEvent(
        actor.workspaceId,
        channelId,
        deleted.map(({ id }) => id),
        actor.id,
        deleted.map(({ seq, authorMemberId }) => ({ seq, authorMemberId })),
      ),
    );
  }
}
