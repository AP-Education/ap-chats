import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Namespace } from 'socket.io';

import { ChannelAudienceFacade } from '@/components/communities/channel-audience';
import { deliverChannelEvent } from '@/components/social/realtime';
import { Logger } from '@/globals/logger';

import { STAR_ME_STATUS_EVENT, StarMeStatusEvent } from './events/star-me-status.event';

@WebSocketGateway({ namespace: '/chats' })
export class StarMeGateway {
  @WebSocketServer()
  private namespace!: Namespace;

  constructor(
    private readonly audience: ChannelAudienceFacade,
    private readonly logger: Logger,
  ) {}

  @OnEvent(STAR_ME_STATUS_EVENT)
  onStatus(event: StarMeStatusEvent): Promise<void> {
    return deliverChannelEvent(
      this.namespace,
      this.audience,
      this.logger,
      STAR_ME_STATUS_EVENT,
      event,
    );
  }
}
