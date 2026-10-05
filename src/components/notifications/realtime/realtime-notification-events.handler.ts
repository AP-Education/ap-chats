import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  CALL_ENTRY_CREATED_EVENT,
  CallEntryCreatedEvent,
} from '@/components/calls/events/call-entry-created.event';
import {
  FORWARD_BATCH_CREATED_EVENT,
  ForwardBatchCreatedEvent,
} from '@/components/social/forwarding/events/forward-batch-created.event';
import {
  MESSAGE_CREATED_EVENT,
  MessageCreatedEvent,
} from '@/components/social/messages/events/message-created.event';
import {
  MESSAGE_DELETED_EVENT,
  MessageDeletedEvent,
} from '@/components/social/messages/events/message-deleted.event';
import {
  MESSAGES_BATCH_DELETED_EVENT,
  MessagesBatchDeletedEvent,
} from '@/components/social/messages/events/messages-batch-deleted.event';
import {
  READ_STATE_ADVANCED_EVENT,
  ReadStateAdvancedEvent,
} from '@/components/social/read-state/events/read-state-advanced.event';
import { RealtimePublisher } from '@/globals/realtime';

import { RealtimeNotificationDeliveryService } from './realtime-notification-delivery.service';

@Injectable()
export class RealtimeNotificationEventsHandler {
  constructor(
    private readonly delivery: RealtimeNotificationDeliveryService,
    private readonly realtime: RealtimePublisher,
  ) {}

  @OnEvent(READ_STATE_ADVANCED_EVENT)
  onReadStateAdvanced(event: ReadStateAdvancedEvent): void {
    this.realtime.toUser(event.userId, 'social:read-state', {
      workspaceId: event.workspaceId,
      channelId: event.channelId,
      ...event.state,
    });
  }

  @OnEvent(MESSAGE_CREATED_EVENT)
  onMessageCreated(event: MessageCreatedEvent): Promise<void> {
    return this.delivery.deliver({
      workspaceId: event.workspaceId,
      channelId: event.channelId,
      actorMemberId: event.actorMemberId,
      eventId: `message.created:${event.messageId}`,
      kind: 'message.created',
      operation: 'append',
      messageIds: [event.messageId],
      entries: [{ seq: event.seq, authorMemberId: event.actorMemberId }],
    });
  }

  @OnEvent(FORWARD_BATCH_CREATED_EVENT)
  onForwardBatch(event: ForwardBatchCreatedEvent): Promise<void> {
    return this.delivery.deliver({
      workspaceId: event.workspaceId,
      channelId: event.channelId,
      actorMemberId: event.actorMemberId,
      eventId: `message.forwarded:${event.messageIds[0]}`,
      kind: 'message.forwarded',
      operation: 'append',
      messageIds: event.messageIds,
      entries: event.entrySeqs.map((seq) => ({ seq, authorMemberId: event.actorMemberId })),
    });
  }

  @OnEvent(CALL_ENTRY_CREATED_EVENT)
  onCallCreated(event: CallEntryCreatedEvent): Promise<void> {
    return this.delivery.deliver({
      workspaceId: event.workspaceId,
      channelId: event.channelId,
      eventId: `call.created:${event.callId}`,
      kind: 'call.created',
      operation: 'append',
      actorMemberId: event.actorMemberId,
      entries: [{ seq: event.seq, authorMemberId: event.actorMemberId }],
      messageIds: [],
    });
  }

  @OnEvent(MESSAGE_DELETED_EVENT)
  onMessageDeleted(event: MessageDeletedEvent): Promise<void> {
    return this.delivery.deliver({
      workspaceId: event.workspaceId,
      channelId: event.channelId,
      eventId: `message.deleted:${event.messageId}`,
      kind: 'message.deleted',
      operation: 'remove',
      actorMemberId: event.actorMemberId,
      entries: [{ seq: event.seq, authorMemberId: event.authorMemberId }],
      messageIds: [],
    });
  }

  @OnEvent(MESSAGES_BATCH_DELETED_EVENT)
  onBatchDeleted(event: MessagesBatchDeletedEvent): Promise<void> {
    return this.delivery.deliver({
      workspaceId: event.workspaceId,
      channelId: event.channelId,
      eventId: `message.batch-deleted:${event.messageIds[0]}`,
      kind: 'message.deleted',
      operation: 'remove',
      actorMemberId: event.actorMemberId,
      entries: event.deletedEntries,
      messageIds: [],
    });
  }
}
