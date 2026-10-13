import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ChannelAccessChangedEvent } from '../sync/channel-access-changed.event';
import { accessNotices } from './access-notices';

const workspaceId = 'workspace';

test("when a channel's lists change, newcomers get the channel and those already there get the new lists", () => {
  const event = new ChannelAccessChangedEvent(
    { workspaceId, channelIds: ['design'] },
    {
      granted: [{ channelId: 'design', memberId: 'olena' }],
      revoked: [{ channelId: 'design', memberId: 'ihor' }],
    },
  );
  const participants = new Map([['design', ['maria', 'olena']]]);

  assert.deepEqual(accessNotices(event, participants), [
    { event: 'communities:channel-granted', memberId: 'olena', channelId: 'design' },
    { event: 'communities:channel-revoked', memberId: 'ihor', channelId: 'design' },
    { event: 'communities:channel-permissions-changed', memberId: 'maria', channelId: 'design' },
  ]);
});

test("when someone's roles change, they learn which channels came and went and to recheck the rest", () => {
  const event = new ChannelAccessChangedEvent(
    { workspaceId, memberIds: ['olena'] },
    { granted: [{ channelId: 'design', memberId: 'olena' }], revoked: [] },
  );

  assert.deepEqual(accessNotices(event, new Map()), [
    { event: 'communities:channel-granted', memberId: 'olena', channelId: 'design' },
    { event: 'communities:access-changed', memberId: 'olena' },
  ]);
});
