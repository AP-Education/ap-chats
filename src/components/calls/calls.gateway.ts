import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Namespace } from 'socket.io';

import { ChannelAudienceFacade } from '@/components/communities/channel-audience';
import { deliverChannelEvent } from '@/components/social/realtime/deliver-channel-event';
import { Logger } from '@/globals/logger';

import { CALL_ENTRY_CREATED_EVENT, CallEntryCreatedEvent } from './events/call-entry-created.event';

@WebSocketGateway({ namespace: '/chats' })
export class CallsGateway {
  @WebSocketServer()
  private namespace!: Namespace;

  constructor(
    private readonly audience: ChannelAudienceFacade,
    private readonly logger: Logger,
  ) {}

  @OnEvent(CALL_ENTRY_CREATED_EVENT)
  onCreated(event: CallEntryCreatedEvent) {
    return deliverChannelEvent(
      this.namespace,
      this.audience,
      this.logger,
      CALL_ENTRY_CREATED_EVENT,
      event,
    );
  }
}
