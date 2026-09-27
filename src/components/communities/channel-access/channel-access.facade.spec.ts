import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { ChannelAccessSnapshot } from '../channels/types/channel-access.types';
import { ChannelAccessFacade } from './channel-access.facade';
import type { ChannelAccessRepository } from './repository/channel-access.repository';

const actor: WorkspaceMember = {
  id: 'member-1',
  workspaceId: 'workspace-1',
  userId: 'user-1',
  role: 'member',
  status: 'active',
  leftAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function channel(id: string, kind: ChannelAccessSnapshot['kind']): ChannelAccessSnapshot {
  return {
    id,
    workspaceId: actor.workspaceId,
    kind,
    createdByMemberId: 'creator',
    lastEntrySeq: 10n,
  };
}

function access(channels: ChannelAccessSnapshot[], memberships: string[], locks: string[] = []) {
  const repository = {
    async lockChannel(_workspaceId: string, id: string) {
      locks.push(id);
      return channels.find((item) => item.id === id);
    },
    async isActiveWorkspaceMember() {
      return true;
    },
    async isChannelMember(id: string) {
      return memberships.includes(id);
    },
  } as ChannelAccessRepository;
  return new ChannelAccessFacade(repository);
}

test('private channel is hidden from a nonmember', async () => {
  await assert.rejects(
    access([channel('private', 'private')], []).requireReadAccess(actor, 'private'),
    { status: 404 },
  );
});

test('posting requires channel membership even in a public channel', async () => {
  await assert.rejects(
    access([channel('public', 'public')], []).requirePostAccess(actor, 'public'),
    { status: 403 },
  );
});

test('forwarding locks channels in stable order and checks destination membership', async () => {
  const locks: string[] = [];
  const facade = access([channel('a', 'public'), channel('z', 'public')], ['a'], locks);
  assert.equal((await facade.requireForwardAccess(actor, 'z', 'a')).id, 'a');
  assert.deepEqual(locks, ['a', 'z']);
});

test('private channel participants can manage pins while public management remains restricted', () => {
  const facade = access([], []);
  assert.doesNotThrow(() => facade.requireManager(actor, channel('private', 'private')));
  assert.throws(() => facade.requireManager(actor, channel('public', 'public')), { status: 403 });
});
