import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { ChannelsRepository } from '../channels/repository';
import type { Channel } from '../channels/types';
import type { ChannelMembershipsRepository } from '../memberships/repository';
import { CommunityAccessService } from './community-access.service';

const workspaceId = 'workspace-1';
const channelId = 'channel-1';
const memberId = 'member-1';

function makeChannel(kind: 'public' | 'private'): Channel {
  return {
    id: channelId,
    workspaceId,
    categoryId: null,
    kind,
    name: 'planning',
    createdByMemberId: 'creator',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeMember(role: 'owner' | 'member' = 'member'): WorkspaceMember {
  return {
    id: memberId,
    workspaceId,
    userId: 'user-1',
    role,
    status: 'active',
    leftAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function accessFor(channel: Channel, joined: boolean): CommunityAccessService {
  return new CommunityAccessService(
    { findById: async () => channel } as unknown as ChannelsRepository,
    { isMember: async () => joined } as unknown as ChannelMembershipsRepository,
  );
}

test('workspace member can view a public channel without joining', async () => {
  const channel = makeChannel('public');
  const access = accessFor(channel, false);
  assert.deepEqual(await access.requireVisibleChannel(workspaceId, channelId, memberId), channel);
  await assert.rejects(access.requireChannelMember(channel, memberId), ForbiddenException);
});

test('private channel is hidden from a nonmember', async () => {
  const access = accessFor(makeChannel('private'), false);
  await assert.rejects(
    access.requireVisibleChannel(workspaceId, channelId, memberId),
    NotFoundException,
  );
});

test('private channel participant can manage it without owner role', async () => {
  const channel = makeChannel('private');
  const access = accessFor(channel, true);
  assert.deepEqual(await access.requireVisibleChannel(workspaceId, channelId, memberId), channel);
  await access.requireManager(channel, makeMember());
});

test('public channel management requires creator or workspace owner', async () => {
  const channel = makeChannel('public');
  const access = accessFor(channel, true);
  await assert.rejects(access.requireManager(channel, makeMember()), ForbiddenException);
  await access.requireManager(channel, makeMember('owner'));
});
