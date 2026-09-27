import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { ChannelAccessSnapshot } from '../channels/types/channel-access.types';
import { ChannelAccessFacade } from './channel-access.facade';
import type { ChannelAccessRepository } from './repository/channel-access.repository';

const actor: WorkspaceMember = {
  id: 'member-1',
  workspaceId: 'workspace-1',
  userProfileId: 'profile-1',
  profile: { id: 'profile-1', oidcUserId: 'user-1', displayName: 'User One', avatarPath: null },
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

function access(
  channels: ChannelAccessSnapshot[],
  memberships: string[],
  locks: string[] = [],
  peerActive = true,
) {
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
    async isDmPeerActive() {
      return peerActive;
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

test('direct messages require both participants and have no channel manager', async () => {
  const dm = channel('dm', 'dm');
  await assert.rejects(access([dm], []).requireReadAccess(actor, dm.id), { status: 404 });
  await assert.rejects(access([dm], [dm.id], [], false).requirePostAccess(actor, dm.id), {
    status: 403,
  });
  assert.throws(() => access([dm], [dm.id]).requireManager(actor, dm), { status: 403 });
});

test('forwarding into a direct message requires an active peer', async () => {
  await assert.rejects(
    access(
      [channel('source', 'public'), channel('target', 'dm')],
      ['target'],
      [],
      false,
    ).requireForwardAccess(actor, 'source', 'target'),
    { status: 403 },
  );
});
