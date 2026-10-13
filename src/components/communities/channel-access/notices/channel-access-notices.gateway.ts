import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway } from '@nestjs/websockets';

import { Logger } from '@/globals/logger';
import { RealtimePublisher } from '@/globals/realtime';

import {
  CHANNEL_ACCESS_CHANGED_EVENT,
  ChannelAccessChangedEvent,
} from '../sync/channel-access-changed.event';
import { ChannelAccessNotices } from './channel-access-notices.service';

@WebSocketGateway({ namespace: '/chats' })
export class ChannelAccessNoticesGateway {
  constructor(
    private readonly notices: ChannelAccessNotices,
    private readonly realtime: RealtimePublisher,
    private readonly logger: Logger,
  ) {}

  @OnEvent(CHANNEL_ACCESS_CHANGED_EVENT)
  async onChanged(event: ChannelAccessChangedEvent): Promise<void> {
    try {
      const notices = await this.notices.addressed(event);
      for (const { userId, event: name, payload } of notices)
        this.realtime.toUser(userId, name, payload);
    } catch (error) {
      this.logger
        .child({ workspaceId: event.scope.workspaceId })
        .error({ err: error }, 'Channel access delivery failed');
    }
  }
}
