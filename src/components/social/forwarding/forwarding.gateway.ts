import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Namespace } from 'socket.io';

import { ChannelAudienceFacade } from '@/components/communities/channel-audience';
import { Logger } from '@/globals/logger';

import { deliverChannelEvent } from '../realtime/deliver-channel-event';
import {
  FORWARD_BATCH_CREATED_EVENT,
  ForwardBatchCreatedEvent,
} from './events/forward-batch-created.event';

@WebSocketGateway({ namespace: '/chats' })
export class ForwardingGateway {
  @WebSocketServer()
  private namespace!: Namespace;

  constructor(
    private readonly audience: ChannelAudienceFacade,
    private readonly logger: Logger,
  ) {}

  @OnEvent(FORWARD_BATCH_CREATED_EVENT)
  onBatchCreated(event: ForwardBatchCreatedEvent): Promise<void> {
    return deliverChannelEvent(
      this.namespace,
      this.audience,
      this.logger,
      FORWARD_BATCH_CREATED_EVENT,
      event,
    );
  }
}
