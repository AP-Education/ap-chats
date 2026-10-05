import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canManageChannel } from '../src/features/communities/channel-permissions';
import type { Channel } from '../src/features/communities/channels/types';
import type { WorkspaceMember } from '../src/features/workspaces/types';

const member = { id: 'member-1', role: 'member' } as WorkspaceMember;

for (const kind of ['public', 'private'] as const) {
  const channel = { kind, isMember: true, createdByMemberId: member.id } as Channel;
  test(`ordinary ${kind} channel creator has no settings or moderation rights`, () => {
    assert.equal(canManageChannel(channel, member), false);
    assert.equal(canManageChannel(channel, undefined), false);
  });
  test(`workspace owner has settings for a joined ${kind} channel`, () => {
    assert.equal(canManageChannel(channel, { ...member, role: 'owner' }), true);
  });
}

test('private channel settings stay hidden from an owner who has not joined', () => {
  assert.equal(
    canManageChannel({ kind: 'private', isMember: false } as Channel, { ...member, role: 'owner' }),
    false,
  );
});

test('public channel settings are available to workspace owner without joining', () => {
  assert.equal(
    canManageChannel({ kind: 'public', isMember: false } as Channel, { ...member, role: 'owner' }),
    true,
  );
});
