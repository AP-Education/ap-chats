import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { TypingDto } from './dto/typing.dto';
import { TypingGateway } from './typing.gateway';

function buildSocket(userId: string | undefined, rooms: string[]) {
  return {
    data: { principal: userId ? { sub: userId } : undefined },
    rooms: new Set(rooms),
  };
}

test('broadcasts typing to the room only for a member already watching the channel', async () => {
  const socket = buildSocket('user-1', ['social:workspace:workspace:channel:channel']);
  const broadcast: unknown[] = [];
  const members = {
    async findForUser() {
      return { id: 'member-1' } as WorkspaceMember;
    },
  } as unknown as WorkspaceMembersRepository;
  const gateway = new TypingGateway(
    members,
    { requireViewAccess: async () => ({}) } as unknown as ChannelAccessPolicy,
    {
      send: async (_scope, event, payload) => {
        broadcast.push({ event, payload });
      },
    } as ChannelBroadcast,
  );
  const dto: TypingDto = Object.assign(new TypingDto(), {
    workspaceId: 'workspace',
    channelId: 'channel',
    isTyping: true,
  });

  await gateway.typing(socket as never, dto);

  assert.deepEqual(broadcast, [
    {
      event: 'social:typing',
      payload: {
        workspaceId: 'workspace',
        channelId: 'channel',
        memberId: 'member-1',
        isTyping: true,
      },
    },
  ]);
});

test('rejects typing from a socket that never joined the channel room', async () => {
  const socket = buildSocket('user-1', []);
  const gateway = new TypingGateway(
    {} as WorkspaceMembersRepository,
    {} as ChannelAccessPolicy,
    {} as ChannelBroadcast,
  );
  const dto: TypingDto = Object.assign(new TypingDto(), {
    workspaceId: 'workspace',
    channelId: 'channel',
    isTyping: true,
  });

  await assert.rejects(() => gateway.typing(socket as never, dto));
});
import type { ChannelBroadcast } from '../realtime/channel-broadcast';
