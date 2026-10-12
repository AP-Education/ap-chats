import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway } from '@nestjs/websockets';

import { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import { Logger } from '@/globals/logger';
import { RealtimePublisher } from '@/globals/realtime';

import { ChannelAudienceFacade } from '../channel-audience';
import {
  CHANNEL_ACCESS_CHANGED_EVENT,
  ChannelAccessChangedEvent,
} from './sync/channel-access-changed.event';

@WebSocketGateway({ namespace: '/chats' })
export class ChannelAccessGateway {
  constructor(
    private readonly members: WorkspaceMembersRepository,
    private readonly audience: ChannelAudienceFacade,
    private readonly realtime: RealtimePublisher,
    private readonly logger: Logger,
  ) {}

  @OnEvent(CHANNEL_ACCESS_CHANGED_EVENT)
  async onChanged({ scope, changes }: ChannelAccessChangedEvent): Promise<void> {
    const { workspaceId } = scope;

    try {
      const scopedMemberIds = 'memberIds' in scope ? scope.memberIds : [];
      const changedMemberIds = [...changes.granted, ...changes.revoked].map(
        ({ memberId }) => memberId,
      );
      const people = await this.members.findManyByIds(workspaceId, [
        ...new Set([...changedMemberIds, ...scopedMemberIds]),
      ]);
      const userIdOf = new Map(people.map((person) => [person.id, person.profile.oidcUserId]));

      const announce = (memberId: string, event: string, payload: object) => {
        const userId = userIdOf.get(memberId);
        if (userId) this.realtime.toUser(userId, event, { workspaceId, ...payload });
      };

      for (const { channelId, memberId } of changes.granted)
        announce(memberId, 'communities:channel-granted', { channelId });
      for (const { channelId, memberId } of changes.revoked)
        announce(memberId, 'communities:channel-revoked', { channelId });

      if ('memberIds' in scope) {
        // Their roles changed, so what they may do in channels they keep may have changed too.
        for (const memberId of scope.memberIds)
          announce(memberId, 'communities:access-changed', {});
        return;
      }

      const newcomers = new Set(
        changes.granted.map((grant) => `${grant.channelId}:${grant.memberId}`),
      );
      for (const channelId of scope.channelIds) {
        const recipients = await this.audience.recipients(workspaceId, channelId);
        for (const recipient of recipients) {
          if (newcomers.has(`${channelId}:${recipient.memberId}`)) continue;
          this.realtime.toUser(recipient.userId, 'communities:channel-permissions-changed', {
            workspaceId,
            channelId,
          });
        }
      }
    } catch (error) {
      this.logger.child({ workspaceId }).error({ err: error }, 'Channel access delivery failed');
    }
  }
}
