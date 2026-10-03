import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { TypingDto } from './dto/typing.dto';
import { TypingGateway } from './typing.gateway';

function buildSocket(userId: string | undefined, rooms: string[]) {
  const broadcast: unknown[] = [];
  const socket = {
    data: { principal: userId ? { sub: userId } : undefined },
    rooms: new Set(rooms),
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          broadcast.push({ room, event, payload });
        },
      };
    },
  };
  return { socket, broadcast };
}

test('broadcasts typing to the room only for a member already watching the channel', async () => {
  const { socket, broadcast } = buildSocket('user-1', [
    'social:workspace:workspace:channel:channel',
  ]);
  const members = {
    async findForUser() {
      return { id: 'member-1' } as WorkspaceMember;
    },
  } as unknown as WorkspaceMembersRepository;
  const gateway = new TypingGateway(members);
  const dto: TypingDto = Object.assign(new TypingDto(), {
    workspaceId: 'workspace',
    channelId: 'channel',
    isTyping: true,
  });

  await gateway.typing(socket as never, dto);

  assert.deepEqual(broadcast, [
    {
      room: 'social:workspace:workspace:channel:channel',
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
  const { socket, broadcast } = buildSocket('user-1', []);
  const gateway = new TypingGateway({} as unknown as WorkspaceMembersRepository);
  const dto: TypingDto = Object.assign(new TypingDto(), {
    workspaceId: 'workspace',
    channelId: 'channel',
    isTyping: true,
  });

  await assert.rejects(() => gateway.typing(socket as never, dto));
  assert.equal(broadcast.length, 0);
});
