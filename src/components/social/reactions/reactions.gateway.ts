import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Namespace } from 'socket.io';

import { ChannelAudienceFacade } from '@/components/communities/channel-audience';
import { Logger } from '@/globals/logger';

import { broadcastToChannel } from '../realtime/deliver-channel-event';
import { REACTION_CHANGED_EVENT, ReactionChangedEvent } from './events/reaction-changed.event';

@WebSocketGateway({ namespace: '/chats' })
export class ReactionsGateway {
  @WebSocketServer()
  private namespace!: Namespace;

  constructor(
    private readonly audience: ChannelAudienceFacade,
    private readonly logger: Logger,
  ) {}

  // A state to apply in place rather than a hint to fetch again, so it has its own socket event.
  @OnEvent(REACTION_CHANGED_EVENT)
  onChanged(event: ReactionChangedEvent): Promise<void> {
    const payload = {
      workspaceId: event.workspaceId,
      channelId: event.channelId,
      messageId: event.messageId,
      actorMemberId: event.actorMemberId,
      added: event.added,
      reaction: event.reaction,
    };
    return broadcastToChannel(
      this.namespace,
      this.audience,
      this.logger,
      event,
      'social:reaction',
      payload,
    );
  }
}
