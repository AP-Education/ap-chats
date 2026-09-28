import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { CommunityAccessService } from '../channel-access/community-access.service';
import type { ChannelCategoriesRepository } from '../channel-categories/repository';
import type { ChannelMembershipsRepository } from '../memberships/repository';
import { ChannelsService } from './channels.service';
import type { ChannelsRepository } from './repository';
import type { Channel } from './types';

const channel: Channel = {
  id: 'channel-1',
  workspaceId: 'workspace-1',
  categoryId: null,
  kind: 'public',
  name: 'planning',
  createdByMemberId: 'creator',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const member: WorkspaceMember = {
  id: 'member-1',
  workspaceId: channel.workspaceId,
  userProfileId: 'profile-1',
  profile: { id: 'profile-1', oidcUserId: 'user-1', displayName: 'User One', avatarPath: null },
  role: 'member',
  status: 'active',
  leftAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeService(remove: () => Promise<boolean>) {
  const repository = {
    findById: async () => channel,
    remove,
  } as unknown as ChannelsRepository;
  const access = new CommunityAccessService(repository, {
    isMember: async () => true,
  } as unknown as ChannelMembershipsRepository);
  return new ChannelsService(repository, {} as ChannelCategoriesRepository, access);
}

test('creator can delete a public channel', async () => {
  let removed = false;
  const service = makeService(async () => {
    removed = true;
    return true;
  });
  await service.remove({ ...member, id: channel.createdByMemberId }, channel.id);
  assert.equal(removed, true);
});

test('other member cannot delete a public channel', async () => {
  let removed = false;
  const service = makeService(async () => {
    removed = true;
    return true;
  });
  await assert.rejects(service.remove(member, channel.id), ForbiddenException);
  assert.equal(removed, false);
});

test('delete reports a channel removed by another request', async () => {
  const service = makeService(async () => false);
  await assert.rejects(service.remove({ ...member, role: 'owner' }, channel.id), NotFoundException);
});
