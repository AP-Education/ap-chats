import { Injectable } from '@nestjs/common';

import { ChannelAudienceFacade } from '@/components/communities/channel-audience';
import { Logger } from '@/globals/logger';
import { RealtimePublisher } from '@/globals/realtime';

import { channelRoom } from './channel-room';

interface ChannelScope {
  workspaceId: string;
  channelId: string;
}

@Injectable()
export class ChannelBroadcast {
  constructor(
    private readonly realtime: RealtimePublisher,
    private readonly audience: ChannelAudienceFacade,
    private readonly logger: Logger,
  ) {}

  /** A change clients fetch again on their own, as `social:changed`. */
  changed<T extends ChannelScope>(type: string, event: T): Promise<void> {
    return this.send(event, 'social:changed', { type, ...event });
  }

  // Delivery runs after the change committed, so a failure is logged, never thrown back.
  async send(channel: ChannelScope, name: string, payload: object): Promise<void> {
    const { workspaceId, channelId } = channel;
    const admit = (userIds: string[]) =>
      this.audience.allowedUserIds(workspaceId, channelId, userIds);

    try {
      await this.realtime.toWatchers(channelRoom(workspaceId, channelId), name, payload, admit);
    } catch (error) {
      this.logger.child({ channelId }).error({ err: error }, 'Social realtime delivery failed');
    }
  }
}
