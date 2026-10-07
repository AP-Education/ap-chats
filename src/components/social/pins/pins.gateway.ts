import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Namespace } from 'socket.io';

import { ChannelAudienceFacade } from '@/components/communities/channel-audience';
import { Logger } from '@/globals/logger';

import { deliverChannelEvent } from '../realtime/deliver-channel-event';
import { PIN_ADDED_EVENT, PinAddedEvent } from './events/pin-added.event';
import { PIN_REMOVED_EVENT, PinRemovedEvent } from './events/pin-removed.event';

@WebSocketGateway({ namespace: '/chats' })
export class PinsGateway {
  @WebSocketServer()
  private namespace!: Namespace;

  constructor(
    private readonly audience: ChannelAudienceFacade,
    private readonly logger: Logger,
  ) {}

  @OnEvent(PIN_ADDED_EVENT)
  onAdded(event: PinAddedEvent): Promise<void> {
    return deliverChannelEvent(this.namespace, this.audience, this.logger, PIN_ADDED_EVENT, event);
  }

  @OnEvent(PIN_REMOVED_EVENT)
  onRemoved(event: PinRemovedEvent): Promise<void> {
    return deliverChannelEvent(
      this.namespace,
      this.audience,
      this.logger,
      PIN_REMOVED_EVENT,
      event,
    );
  }
}
