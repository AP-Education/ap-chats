import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seedConversations } from '@/testing/conversations';
import { notificationServices } from '@/testing/notifications';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import {
  NOTIFICATIONS_CHANGED_EVENT,
  type NotificationsChangedEvent,
} from './events/notifications-changed.event';

test('notification settings on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const seed = seedConversations(db);
  const { settings, events } = notificationServices(transactionHost(db));

  await t.test('a muted workspace silences its channels, never its direct messages', async () => {
    const workspaceId = await seed.workspace();
    const ann = await seed.join(workspaceId, await seed.person('Ann'));
    const rob = await seed.join(workspaceId, await seed.person('Rob'));
    const channel = await seed.channel(ann, 'public', [rob]);
    await seed.conversation(ann, rob);

    const initial = await settings.ofWorkspace(rob);
    assert.deepEqual(initial.mutedChannelIds, []);
    assert.equal(initial.changesAt, null);

    const muted = await settings.changeWorkspace(rob, { type: 'mute', duration: 'hour' });
    assert.equal(muted.settings.isMuted, true);
    assert.deepEqual(muted.mutedChannelIds, [channel.channelId]);
    assert.equal(muted.changesAt, muted.settings.mutedUntil, 'it speaks again once the hour ends');

    const unmuted = await settings.changeWorkspace(rob, { type: 'unmute' });
    assert.deepEqual(unmuted.mutedChannelIds, []);
  });

  await t.test(
    "every change reaches the member's devices as the workspace's new state",
    async () => {
      const workspaceId = await seed.workspace();
      const ann = await seed.join(workspaceId, await seed.person('Ann'));
      const rob = await seed.join(workspaceId, await seed.person('Rob'));
      const chat = await seed.conversation(ann, rob);

      const view = await settings.changeChannel(rob, chat.channelId, {
        type: 'mute',
        duration: 'indefinite',
      });
      const changed = events.lastOf<NotificationsChangedEvent>(NOTIFICATIONS_CHANGED_EVENT);

      assert.equal(view.isMuted, true);
      assert.equal(changed?.userId, rob.profile.oidcUserId);
      assert.equal(changed?.workspaceId, workspaceId);
      assert.deepEqual(changed?.notifications.mutedChannelIds, [chat.channelId]);
    },
  );
});
