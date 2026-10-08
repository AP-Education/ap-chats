import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import type { Logger } from '@/globals/logger';
import type { RealtimePublisher } from '@/globals/realtime';

import type { ChannelAudienceFacade } from '../channel-audience';
import { ChannelsGateway } from './channels.gateway';
import { ChannelCreatedEvent } from './events/channel-created.event';

function fixture() {
  const sent: { userId: string; event: string; payload: unknown }[] = [];
  const errors: unknown[] = [];
  const members = {
    findAllForWorkspace: async (workspaceId: string) => {
      assert.equal(workspaceId, 'workspace');
      return [
        { status: 'active', profile: { oidcUserId: 'owner' } },
        { status: 'active', profile: { oidcUserId: 'other-member' } },
        { status: 'removed', profile: { oidcUserId: 'removed' } },
      ] as WorkspaceMember[];
    },
  };
  const audience = {
    recipients: async (workspaceId: string, channelId: string) => {
      assert.equal(workspaceId, 'workspace');
      assert.equal(channelId, 'channel');
      return [{ userId: 'owner', memberId: 'owner-member' }];
    },
  };
  const gateway = new ChannelsGateway(
    members as WorkspaceMembersRepository,
    audience as ChannelAudienceFacade,
    {
      toUser: (userId, event, payload) => {
        sent.push({ userId, event, payload });
      },
      toConversation: () => assert.fail('Inventory events must use authorized user rooms'),
    } satisfies RealtimePublisher,
    { child: () => ({ error: (error: unknown) => errors.push(error) }) } as unknown as Logger,
  );
  return { gateway, members, audience, sent, errors };
}

test('new public channels notify all active workspace members, including non-channel members', async () => {
  const f = fixture();
  f.audience.recipients = async () => {
    assert.fail('Public visibility is workspace-wide');
  };
  await f.gateway.onCreated(new ChannelCreatedEvent('workspace', 'channel', 'public'));
  assert.deepEqual(
    f.sent,
    ['owner', 'other-member'].map((userId) => ({
      userId,
      event: 'communities:changed',
      payload: {
        type: 'communities.channel.created',
        workspaceId: 'workspace',
        channelId: 'channel',
      },
    })),
  );
});

test('new private channels are announced only to their authorized recipients', async () => {
  const f = fixture();
  f.members.findAllForWorkspace = async () => {
    assert.fail('Private creation must not broadcast to the workspace');
  };
  await f.gateway.onCreated(new ChannelCreatedEvent('workspace', 'channel', 'private'));
  assert.deepEqual(
    f.sent.map(({ userId }) => userId),
    ['owner'],
  );
});

test('delivery failures are logged without turning committed creation into an API failure', async () => {
  const f = fixture();
  f.members.findAllForWorkspace = async () => {
    throw new Error('Database unavailable');
  };
  await f.gateway.onCreated(new ChannelCreatedEvent('workspace', 'channel', 'public'));
  assert.equal(f.sent.length, 0);
  assert.equal(f.errors.length, 1);
});
