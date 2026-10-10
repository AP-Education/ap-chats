import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Namespace } from 'socket.io';

import { ChannelAudienceFacade } from '@/components/communities/channel-audience';
import { Logger } from '@/globals/logger';

import { deliverChannelEvent } from '../realtime/deliver-channel-event';
import { REACTION_ADDED_EVENT, ReactionAddedEvent } from './events/reaction-added.event';
import { REACTION_REMOVED_EVENT, ReactionRemovedEvent } from './events/reaction-removed.event';

@WebSocketGateway({ namespace: '/chats' })
export class ReactionsGateway {
  @WebSocketServer()
  private namespace!: Namespace;

  constructor(
    private readonly audience: ChannelAudienceFacade,
    private readonly logger: Logger,
  ) {}

  @OnEvent(REACTION_ADDED_EVENT)
  onAdded(event: ReactionAddedEvent): Promise<void> {
    return deliverChannelEvent(
      this.namespace,
      this.audience,
      this.logger,
      REACTION_ADDED_EVENT,
      event,
    );
  }

  @OnEvent(REACTION_REMOVED_EVENT)
  onRemoved(event: ReactionRemovedEvent): Promise<void> {
    return deliverChannelEvent(
      this.namespace,
      this.audience,
      this.logger,
      REACTION_REMOVED_EVENT,
      event,
    );
  }
}
