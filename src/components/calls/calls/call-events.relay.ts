import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { ChannelBroadcast } from '@/components/social/realtime';
import { RealtimePublisher } from '@/globals/realtime';

import { CALL_ENTRY_CREATED_EVENT, CallEntryCreatedEvent } from './events/call-entry-created.event';
import { CALL_SIGNAL_EVENT, CallSignalEvent } from './events/call-signal.event';

@Injectable()
export class CallEventsRelay {
  constructor(
    private readonly channels: ChannelBroadcast,
    private readonly realtime: RealtimePublisher,
  ) {}

  @OnEvent(CALL_ENTRY_CREATED_EVENT)
  onEntryCreated(event: CallEntryCreatedEvent) {
    return this.channels.changed(CALL_ENTRY_CREATED_EVENT, event);
  }

  @OnEvent(CALL_SIGNAL_EVENT)
  onSignal(event: CallSignalEvent) {
    for (const userId of event.recipientUserIds)
      this.realtime.toUser(userId, event.kind, event.payload);
  }
}
