import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher, nothingToAnnounce } from '@/globals/publisher';
import type { Announce } from '@/globals/publisher/types';

import { MessagesService } from '../messages';
import {
  MESSAGE_DELETED_EVENT,
  MessageDeletedEvent,
  PRIVATE_MESSAGE_DELETED_EVENT,
} from '../messages/events/message-deleted.event';
import {
  MESSAGES_BATCH_DELETED_EVENT,
  MessagesBatchDeletedEvent,
  PRIVATE_MESSAGES_BATCH_DELETED_EVENT,
} from '../messages/events/messages-batch-deleted.event';
import type { DeletedMessage } from '../messages/types/message.types';
import { PinsService } from '../pins';

@Injectable()
export class DeleteMessagesService {
  constructor(
    private readonly access: ChannelAccessPolicy,
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
    const moderates = this.access.manages(actor, channel);

    const deleted = await this.messages.remove(actor, channelId, { ids, moderates });
    await this.pins.removeForMessages(deleted.map(({ id }) => id));

    return { deleted, announce: await this.recordDeletion(actor, channelId, deleted) };
  }

  private async recordDeletion(
    actor: WorkspaceMember,
    channelId: string,
    deleted: DeletedMessage[],
  ): Promise<Announce> {
    const announcements: Announce[] = [];
    for (const privateGroup of [false, true]) {
      const group = deleted.filter((item) => Boolean(item.privateToUserId) === privateGroup);
      const [only] = group;
      if (!only) continue;
      const privateTo = privateGroup ? actor.profile.oidcUserId : undefined;
      const name =
        group.length === 1
          ? privateGroup
            ? PRIVATE_MESSAGE_DELETED_EVENT
            : MESSAGE_DELETED_EVENT
          : privateGroup
            ? PRIVATE_MESSAGES_BATCH_DELETED_EVENT
            : MESSAGES_BATCH_DELETED_EVENT;
      const event =
        group.length === 1
          ? new MessageDeletedEvent(
              actor.workspaceId,
              channelId,
              only.id,
              only.seq,
              actor.id,
              only.authorMemberId,
              privateTo,
            )
          : new MessagesBatchDeletedEvent(
              actor.workspaceId,
              channelId,
              group.map(({ id }) => id),
              actor.id,
              group.map(({ seq, authorMemberId }) => ({ seq, authorMemberId })),
              privateTo,
            );
      announcements.push(await this.events.record(name, event));
    }
    if (!announcements.length) return nothingToAnnounce;
    return () => {
      announcements.forEach((announce) => announce());
    };
  }
}
