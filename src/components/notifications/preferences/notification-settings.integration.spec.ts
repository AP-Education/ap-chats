import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seedConversations } from '@/testing/conversations';
import { notificationServices } from '@/testing/notifications';
import { migratedDatabase, transactionHost } from '@/testing/pglite';

import type { WorkspaceNotifications } from './types';

test('notification settings on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const seed = seedConversations(db);
  const { settings } = notificationServices(transactionHost(db));

  function notifyOf(notifications: WorkspaceNotifications, channelId: string) {
    return notifications.conversations.find((conversation) => conversation.channelId === channelId);
  }

  await t.test('a workspace sets what its channels tell, never its direct messages', async () => {
    const workspaceId = await seed.workspace();
    const ann = await seed.join(workspaceId, await seed.person('Ann'));
    const rob = await seed.join(workspaceId, await seed.person('Rob'));
    const channel = await seed.channel(ann, 'public', [rob]);
    const chat = await seed.conversation(ann, rob);

    const initial = await settings.forWorkspace(rob);
    assert.equal(notifyOf(initial, channel.channelId)?.notify, 'mentions');
    assert.equal(notifyOf(initial, chat.channelId)?.notify, 'all');

    const muted = await settings.changeForWorkspace(rob, { type: 'mute', duration: 'hour' });
    assert.equal(muted.settings.isMuted, true);
    assert.deepEqual(notifyOf(muted, channel.channelId), {
      channelId: channel.channelId,
      notify: 'none',
      mutedUntil: muted.settings.mutedUntil,
    });
    assert.equal(notifyOf(muted, chat.channelId)?.notify, 'all');

    await settings.change(rob, channel.channelId, { type: 'level', level: 'all' });
    const unmuted = await settings.changeForWorkspace(rob, { type: 'unmute' });
    assert.equal(notifyOf(unmuted, channel.channelId)?.notify, 'all', 'its own choice comes back');
  });
});
