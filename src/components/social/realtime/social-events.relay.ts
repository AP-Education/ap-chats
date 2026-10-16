import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { RealtimePublisher } from '@/globals/realtime';

import {
  FORWARD_BATCH_CREATED_EVENT,
  ForwardBatchCreatedEvent,
} from '../forwarding/events/forward-batch-created.event';
import {
  MESSAGE_CREATED_EVENT,
  MessageCreatedEvent,
} from '../messages/events/message-created.event';
import {
  MESSAGE_DELETED_EVENT,
  MessageDeletedEvent,
} from '../messages/events/message-deleted.event';
import {
  MESSAGE_UPDATED_EVENT,
  MessageUpdatedEvent,
} from '../messages/events/message-updated.event';
import {
  MESSAGES_BATCH_DELETED_EVENT,
  MessagesBatchDeletedEvent,
} from '../messages/events/messages-batch-deleted.event';
import { PIN_ADDED_EVENT, PinAddedEvent } from '../pins/events/pin-added.event';
import { PIN_REMOVED_EVENT, PinRemovedEvent } from '../pins/events/pin-removed.event';
import {
  REACTION_CHANGED_EVENT,
  ReactionChangedEvent,
} from '../reactions/events/reaction-changed.event';
import { READ_RECEIPT_EVENT, ReadReceiptEvent } from '../read-state/events/read-receipt.event';
import {
  READ_STATE_ADVANCED_EVENT,
  ReadStateAdvancedEvent,
} from '../read-state/events/read-state-advanced.event';
import {
  READ_STATE_REWOUND_EVENT,
  ReadStateRewoundEvent,
} from '../read-state/events/read-state-rewound.event';
import {
  SCHEDULED_MESSAGES_CHANGED_EVENT,
  ScheduledMessagesChangedEvent,
} from '../scheduling/events/scheduled-messages-changed.event';
import { ChannelBroadcast } from './channel-broadcast';

/** Social's socket protocol in one place: which committed change reaches whom, and as what. */
@Injectable()
export class SocialEventsRelay {
  constructor(
    private readonly channels: ChannelBroadcast,
    private readonly realtime: RealtimePublisher,
  ) {}

  @OnEvent(MESSAGE_CREATED_EVENT)
  onMessageCreated(event: MessageCreatedEvent) {
    return this.channels.changed(MESSAGE_CREATED_EVENT, event);
  }

  @OnEvent(MESSAGE_UPDATED_EVENT)
  onMessageUpdated(event: MessageUpdatedEvent) {
    return this.channels.changed(MESSAGE_UPDATED_EVENT, event);
  }

  @OnEvent(MESSAGE_DELETED_EVENT)
  onMessageDeleted(event: MessageDeletedEvent) {
    return this.channels.changed(MESSAGE_DELETED_EVENT, event);
  }

  @OnEvent(MESSAGES_BATCH_DELETED_EVENT)
  onMessagesDeleted(event: MessagesBatchDeletedEvent) {
    return this.channels.changed(MESSAGES_BATCH_DELETED_EVENT, event);
  }

  @OnEvent(FORWARD_BATCH_CREATED_EVENT)
  onForwarded(event: ForwardBatchCreatedEvent) {
    return this.channels.changed(FORWARD_BATCH_CREATED_EVENT, event);
  }

  @OnEvent(PIN_ADDED_EVENT)
  onPinAdded(event: PinAddedEvent) {
    return this.channels.changed(PIN_ADDED_EVENT, event);
  }

  @OnEvent(PIN_REMOVED_EVENT)
  onPinRemoved(event: PinRemovedEvent) {
    return this.channels.changed(PIN_REMOVED_EVENT, event);
  }

  // A state to apply in place rather than a hint to fetch again, so it has its own socket event.
  @OnEvent(REACTION_CHANGED_EVENT)
  onReactionChanged(event: ReactionChangedEvent) {
    const { workspaceId, channelId, messageId, actorMemberId, added, reaction } = event;
    const payload = { workspaceId, channelId, messageId, actorMemberId, added, reaction };
    return this.channels.send(event, 'social:reaction', payload);
  }

  // The reader's other devices move their own cursor along.
  @OnEvent(READ_STATE_ADVANCED_EVENT)
  onReadStateAdvanced(event: ReadStateAdvancedEvent) {
    const { workspaceId, channelId, state } = event;
    this.realtime.toUser(event.userId, 'social:read-state', { workspaceId, channelId, ...state });
  }

  // A cursor gone back is not a late echo of an older read, so it has its own socket event.
  @OnEvent(READ_STATE_REWOUND_EVENT)
  onReadStateRewound(event: ReadStateRewoundEvent) {
    const { workspaceId, channelId, state } = event;
    const payload = { workspaceId, channelId, ...state };
    this.realtime.toUser(event.userId, 'social:read-state-rewound', payload);
  }

  @OnEvent(READ_RECEIPT_EVENT)
  onReadReceipt(event: ReadReceiptEvent) {
    const { workspaceId, channelId, memberId, seq } = event;
    const payload = { workspaceId, channelId, memberId, seq };
    return this.channels.send(event, 'social:read-receipt', payload);
  }

  // A schedule is its author's alone, so only their devices learn to fetch it again.
  @OnEvent(SCHEDULED_MESSAGES_CHANGED_EVENT)
  onScheduledMessagesChanged(event: ScheduledMessagesChangedEvent) {
    const { workspaceId, channelId } = event;
    this.realtime.toUser(event.userId, 'social:scheduled', { workspaceId, channelId });
  }
}
