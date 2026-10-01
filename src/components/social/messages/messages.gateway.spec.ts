import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { ChannelAudienceFacade } from '@/components/communities/channel-audience/channel-audience.facade';
import type { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import type { Logger } from '@/globals/logger';

import { MessageCreatedEvent } from './events/message-created.event';
import { MessagesGateway } from './messages.gateway';

test('sends a channel invalidation only to currently authorized sockets', async () => {
  const received: unknown[] = [];
  const left: string[] = [];
  const socket = (userId: string) => ({
    data: { principal: { sub: userId } },
    emit(event: string, payload: unknown) {
      received.push({ userId, event, payload });
    },
    async leave(room: string) {
      left.push(`${userId}:${room}`);
    },
  });
  const roomSockets = [socket('allowed'), socket('removed')];
  const audience = {
    async allowedUserIds(_workspaceId: string, _channelId: string, candidates: string[]) {
      assert.deepEqual(candidates, ['allowed', 'removed']);
      return ['allowed'];
    },
  } as ChannelAudienceFacade;
  const gateway = new MessagesGateway(
    {} as WorkspaceMembersRepository,
    {} as ChannelAccessFacade,
    audience,
    {} as Logger,
  );
  Object.assign(gateway, {
    namespace: {
      in: () => ({ fetchSockets: async () => roomSockets }),
    },
  });

  await gateway.onCreated(
    new MessageCreatedEvent('workspace', 'channel', 'message', '12', 'actor'),
  );

  assert.equal(received.length, 1);
  assert.deepEqual(received[0], {
    userId: 'allowed',
    event: 'social:changed',
    payload: {
      type: 'social.message.created',
      workspaceId: 'workspace',
      channelId: 'channel',
      messageId: 'message',
      seq: '12',
      actorMemberId: 'actor',
    },
  });
  assert.deepEqual(left, ['removed:social:workspace:workspace:channel:channel']);
});
