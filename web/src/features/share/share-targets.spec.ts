import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Channel } from '../communities/channels/types/index.ts';
import type { DirectMessage } from '../social/direct-messages/api/direct-messages-api.ts';
import { matchingTargets, shareTargets, targetPath } from './share-targets.ts';

const at = '2026-10-16T12:00:00.000Z';
const office = { id: 'w1', name: 'Офіс', avatarPath: null, createdAt: at, updatedAt: at };

function direct(id: string, displayName: string, active = true): DirectMessage {
  return {
    id,
    workspaceId: office.id,
    participant: { memberId: `m-${id}`, displayName, avatarPath: null, active },
    notification: { isMuted: false, mutedUntil: null },
    lastMessage: null,
    updatedAt: at,
  };
}

function channel(id: string, name: string, access: Partial<Channel> = {}): Channel {
  return {
    id,
    workspaceId: office.id,
    categoryId: null,
    kind: 'channel',
    name,
    createdByMemberId: 'm-owner',
    createdAt: at,
    updatedAt: at,
    isOpen: true,
    isMember: true,
    canPost: true,
    canManage: false,
    ...access,
  };
}

test('people come first, then the channels the person can write in', () => {
  const targets = shareTargets(
    [direct('d1', 'Олена'), direct('d2', 'Колишній колега', false)],
    [
      {
        workspace: office,
        channels: [
          channel('c1', 'загальний'),
          channel('c2', 'оголошення', { canPost: false }),
          channel('c3', 'архів', { isMember: false }),
        ],
      },
    ],
  );

  assert.deepEqual(
    targets.map(({ kind, name, workspaceName }) => [kind, name, workspaceName]),
    [
      ['direct', 'Олена', null],
      ['channel', 'загальний', 'Офіс'],
    ],
  );
  assert.deepEqual(targets.map(targetPath), ['/direct/d1', '/channels/c1']);
});

test('a search finds a conversation by its name or its workspace, in any case', () => {
  const targets = shareTargets(
    [direct('d1', 'Олена')],
    [{ workspace: office, channels: [channel('c1', 'загальний')] }],
  );

  assert.deepEqual(
    matchingTargets(targets, ' олен').map(({ name }) => name),
    ['Олена'],
  );
  assert.deepEqual(
    matchingTargets(targets, 'ОФІС').map(({ name }) => name),
    ['загальний'],
  );
  assert.equal(matchingTargets(targets, '').length, 2);
});
