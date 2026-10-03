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
    userProfileId: 'profile-1',
    profile: { id: 'profile-1', oidcUserId: 'user-1', displayName: 'User One', avatarPath: null },
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

test('private channel participant can read but cannot manage the channel', async () => {
  const channel = makeChannel('private');
  const access = accessFor(channel, true);
  assert.deepEqual(await access.requireVisibleChannel(workspaceId, channelId, memberId), channel);
  await assert.rejects(access.requireManager(channel, makeMember()), ForbiddenException);
  await access.requireManager(channel, makeMember('owner'));
});

test('public channel management requires workspace owner even for the creator', async () => {
  const channel = makeChannel('public');
  const access = accessFor(channel, true);
  await assert.rejects(access.requireManager(channel, makeMember()), ForbiddenException);
  await assert.rejects(
    access.requireManager(channel, { ...makeMember(), id: channel.createdByMemberId }),
    ForbiddenException,
  );
  await access.requireManager(channel, makeMember('owner'));
});

test('workspace owner cannot manage a private channel they have not joined', async () => {
  const channel = makeChannel('private');
  await assert.rejects(
    accessFor(channel, false).requireManager(channel, makeMember('owner')),
    ForbiddenException,
  );
});
