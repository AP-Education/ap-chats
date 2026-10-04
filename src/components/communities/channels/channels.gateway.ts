import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway } from '@nestjs/websockets';

import { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import { Logger } from '@/globals/logger';
import { RealtimePublisher } from '@/globals/realtime';

import { ChannelAudienceFacade } from '../channel-audience/channel-audience.facade';
import { CHANNEL_CREATED_EVENT, ChannelCreatedEvent } from './events/channel-created.event';

@WebSocketGateway({ namespace: '/chats' })
export class ChannelsGateway {
  constructor(
    private readonly members: WorkspaceMembersRepository,
    private readonly audience: ChannelAudienceFacade,
    private readonly realtime: RealtimePublisher,
    private readonly logger: Logger,
  ) {}

  @OnEvent(CHANNEL_CREATED_EVENT)
  async onCreated(event: ChannelCreatedEvent): Promise<void> {
    try {
      const userIds =
        event.kind === 'public'
          ? (await this.members.findAllForWorkspace(event.workspaceId))
              .filter((member) => member.status === 'active')
              .map((member) => member.profile.oidcUserId)
          : (await this.audience.recipients(event.workspaceId, event.channelId)).map(
              (recipient) => recipient.userId,
            );

      for (const userId of new Set(userIds)) {
        this.realtime.toUser(userId, 'communities:changed', {
          type: CHANNEL_CREATED_EVENT,
          workspaceId: event.workspaceId,
          channelId: event.channelId,
        });
      }
    } catch (error) {
      this.logger
        .child({ channelId: event.channelId })
        .error({ err: error }, 'Channel creation realtime delivery failed');
    }
  }
}
