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
  accessLevel: 'member',
  status: 'active',
  leftAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function channel(
  id: string,
  kind: ChannelAccessSnapshot['kind'] = 'channel',
  rights: Partial<Pick<ChannelAccessSnapshot, 'canPost' | 'canManage'>> = {},
): ChannelAccessSnapshot {
  return {
    id,
    workspaceId: actor.workspaceId,
    kind,
    lastEntrySeq: 10n,
    canPost: true,
    canManage: false,
    ...rights,
  };
}

/** The given channels are the ones the actor participates in. */
function access(participating: ChannelAccessSnapshot[], locks: string[] = [], peerActive = true) {
  const repository = {
    async findParticipation(_workspaceId: string, id: string, _memberId: string, lock?: string) {
      if (lock) locks.push(id);
      return participating.find((item) => item.id === id);
    },
    async isActiveWorkspaceMember() {
      return true;
    },
    async isDmPeerActive() {
      return peerActive;
    },
  } as ChannelAccessRepository;
  return new ChannelAccessFacade(repository);
}

test('a channel outside the person lists does not exist for them', async () => {
  await assert.rejects(access([]).requireViewAccess(actor, 'hidden'), { status: 404 });
  await assert.rejects(access([]).requirePostAccess(actor, 'hidden'), { status: 404 });
});

test('a read-only participant reads and reacts but cannot post', async () => {
  const announcements = channel('announcements', 'channel', { canPost: false });
  const facade = access([announcements]);

  assert.equal((await facade.requireReadAccess(actor, announcements.id)).id, announcements.id);
  assert.equal((await facade.requireParticipant(actor, announcements.id)).id, announcements.id);
  await assert.rejects(facade.requirePostAccess(actor, announcements.id), { status: 403 });
});

test('viewing takes no row locks', async () => {
  const locks: string[] = [];
  await access([channel('general')], locks).requireViewAccess(actor, 'general');
  assert.deepEqual(locks, []);
});

test('forwarding locks channels in stable order and needs posting at the destination', async () => {
  const locks: string[] = [];
  const facade = access([channel('a'), channel('z')], locks);
  assert.equal((await facade.requireForwardAccess(actor, 'z', 'a')).id, 'a');
  assert.deepEqual(locks, ['a', 'z']);

  const readOnly = access([channel('source'), channel('target', 'channel', { canPost: false })]);
  await assert.rejects(readOnly.requireForwardAccess(actor, 'source', 'target'), { status: 403 });
});

test('channel managers and workspace managers keep order in a channel', () => {
  const facade = access([]);
  const general = channel('general');

  assert.throws(() => facade.requireManager(actor, general), { status: 403 });
  assert.doesNotThrow(() => facade.requireManager(actor, { ...general, canManage: true }));
  assert.doesNotThrow(() => facade.requireManager({ ...actor, accessLevel: 'manager' }, general));
});

test('direct messages need an active peer to post and have no managers', async () => {
  const dm = channel('dm', 'dm');
  await assert.rejects(access([dm], [], false).requirePostAccess(actor, dm.id), { status: 403 });
  assert.equal(access([dm]).manages({ ...actor, accessLevel: 'owner' }, dm), false);
  assert.throws(() => access([dm]).requireManager(actor, dm), { status: 403 });
});

test('forwarding into a direct message requires an active peer', async () => {
  const facade = access([channel('source'), channel('target', 'dm')], [], false);
  await assert.rejects(facade.requireForwardAccess(actor, 'source', 'target'), { status: 403 });
});
