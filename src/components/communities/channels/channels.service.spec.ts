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

function makeService(
  remove: () => Promise<boolean>,
  target: Channel = channel,
  update: () => Promise<Channel> = async () => target,
) {
  const repository = {
    findById: async () => target,
    remove,
    update,
  } as unknown as ChannelsRepository;
  const access = new CommunityAccessService(repository, {
    isMember: async () => true,
  } as unknown as ChannelMembershipsRepository);
  return new ChannelsService(repository, {} as ChannelCategoriesRepository, access);
}

test('workspace owner can delete a public channel', async () => {
  let removed = false;
  const service = makeService(async () => {
    removed = true;
    return true;
  });
  await service.remove({ ...member, role: 'owner' }, channel.id);
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

for (const kind of ['public', 'private'] as const) {
  test(`ordinary participant and creator cannot rename or move a ${kind} channel`, async () => {
    const target = { ...channel, kind };
    let writes = 0;
    const service = makeService(
      async () => true,
      target,
      async () => {
        writes++;
        return target;
      },
    );
    for (const actor of [member, { ...member, id: target.createdByMemberId }]) {
      await assert.rejects(
        service.update(actor, target.id, { name: 'Renamed' }),
        ForbiddenException,
      );
      await assert.rejects(
        service.update(actor, target.id, { categoryId: null }),
        ForbiddenException,
      );
    }
    assert.equal(writes, 0);
  });

  test(`ordinary participant and creator cannot delete a ${kind} channel`, async () => {
    const target = { ...channel, kind };
    let writes = 0;
    const service = makeService(async () => {
      writes++;
      return true;
    }, target);
    for (const actor of [member, { ...member, id: target.createdByMemberId }]) {
      await assert.rejects(service.remove(actor, target.id), ForbiddenException);
    }
    assert.equal(writes, 0);
  });

  test(`workspace owner can rename a ${kind} channel`, async () => {
    const target = { ...channel, kind };
    let writes = 0;
    const service = makeService(
      async () => true,
      target,
      async () => {
        writes++;
        return { ...target, name: 'Renamed' };
      },
    );
    const updated = await service.update({ ...member, role: 'owner' }, target.id, {
      name: 'Renamed',
    });
    assert.equal(writes, 1);
    assert.equal(updated.name, 'Renamed');
  });

  test(`ordinary member cannot create a ${kind} channel`, async () => {
    let writes = 0;
    const repository = {
      create: async () => {
        writes++;
        return { ...channel, kind };
      },
    } as unknown as ChannelsRepository;
    const service = new ChannelsService(
      repository,
      {} as ChannelCategoriesRepository,
      {} as CommunityAccessService,
    );

    await assert.rejects(service.create(member, { name: 'New channel', kind }), ForbiddenException);
    assert.equal(writes, 0);
  });

  test(`workspace owner can create a ${kind} channel`, async () => {
    let writes = 0;
    const repository = {
      create: async () => {
        writes++;
        return { ...channel, kind };
      },
    } as unknown as ChannelsRepository;
    const service = new ChannelsService(
      repository,
      {} as ChannelCategoriesRepository,
      {} as CommunityAccessService,
    );

    const created = await service.create(
      { ...member, role: 'owner' },
      { name: 'New channel', kind },
    );
    assert.equal(writes, 1);
    assert.equal(created.kind, kind);
    assert.equal(created.isMember, true);
  });
}
