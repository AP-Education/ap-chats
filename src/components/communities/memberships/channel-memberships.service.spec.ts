import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ForbiddenException } from '@nestjs/common';

import type { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { CommunityAccessService } from '../channel-access';
import type { Channel } from '../channels';
import type { ChannelsRepository } from '../channels/repository';
import { ChannelMembershipsService } from './channel-memberships.service';
import type { ChannelMembershipsRepository } from './repository';

for (const kind of ['public', 'private'] as const) {
  function fixture(role: WorkspaceMember['role']) {
    const member = { id: 'member-1', workspaceId: 'workspace-1', role } as WorkspaceMember;
    const channel = {
      id: 'channel-1',
      workspaceId: member.workspaceId,
      kind,
      createdByMemberId: member.id,
    } as Channel;
    const removed: string[] = [];
    const memberships = {
      isMember: async () => true,
      remove: async (_workspaceId: string, _channelId: string, memberId: string) => {
        removed.push(memberId);
        return true;
      },
    } as unknown as ChannelMembershipsRepository;
    const access = new CommunityAccessService(
      { findById: async () => channel } as unknown as ChannelsRepository,
      memberships,
    );
    const service = new ChannelMembershipsService(
      memberships,
      {} as WorkspaceMembersRepository,
      access,
    );
    return { member, channel, removed, service };
  }

  test(`ordinary ${kind} channel creator cannot remove another participant`, async () => {
    const f = fixture('member');
    await assert.rejects(
      f.service.remove(f.member, f.channel.id, 'other-member'),
      ForbiddenException,
    );
    assert.deepEqual(f.removed, []);
  });

  test(`workspace owner can remove another participant from a ${kind} channel`, async () => {
    const f = fixture('owner');
    await f.service.remove(f.member, f.channel.id, 'other-member');
    assert.deepEqual(f.removed, ['other-member']);
  });

  test(`ordinary participant can still leave a ${kind} channel`, async () => {
    const f = fixture('member');
    await f.service.remove(f.member, f.channel.id);
    assert.deepEqual(f.removed, [f.member.id]);
  });
}
