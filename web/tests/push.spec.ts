import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { notificationIntent } from '../src/features/notifications/navigation/notification-intent';

const channelId = '5824eb71-b12c-4f48-a30d-e15797b7116b';
const workspaceId = '630bba71-6807-445a-9dbe-aad85a050c09';
const intent = {
  eventId: 'event',
  userId: 'user',
  channelId,
  workspaceId,
  url: `/channels/${channelId}?pushWorkspace=${workspaceId}`,
};

test('notification intent accepts only the matching channel and workspace route', () => {
  assert.equal(notificationIntent(intent)?.channelId, channelId);
  for (const url of [
    'https://attacker.test/',
    '//attacker.test/',
    '/auth/callback',
    `/channels/${channelId}?pushWorkspace=another-workspace`,
  ]) {
    assert.equal(notificationIntent({ ...intent, url }), null);
  }
  assert.equal(notificationIntent({ ...intent, channelId: 'invalid' }), null);
});

function workerFixture() {
  const listeners = new Map<string, (event: unknown) => void>();
  type NotificationOptions = {
    tag?: string;
    renotify?: boolean;
    data: { url: string; userId: string };
  };
  const shown: { title: string; options: NotificationOptions }[] = [];
  const opened: string[] = [];
  const navigated: string[] = [];
  const focused: boolean[] = [];
  let windows: unknown[] = [];
  const self = {
    location: { origin: 'https://connect.test' },
    addEventListener: (name: string, handler: (event: unknown) => void) =>
      listeners.set(name, handler),
    registration: {
      showNotification: async (title: string, options: NotificationOptions) => {
        shown.push({ title, options });
      },
    },
    clients: {
      matchAll: async () => windows,
      openWindow: async (url: string) => {
        opened.push(url);
      },
    },
  };
  runInNewContext(readFileSync(new URL('../public/push-sw.js', import.meta.url), 'utf8'), {
    self,
    URL,
  });
  return {
    shown,
    opened,
    navigated,
    focused,
    addWindow: () => {
      windows = [
        {
          url: 'https://connect.test/',
          navigate: async (url: string) => {
            navigated.push(url);
          },
          focus: async () => {
            focused.push(true);
          },
        },
      ];
    },
    emit: async (name: string, event: object) => {
      let pending: Promise<void> = Promise.resolve();
      listeners.get(name)?.({
        ...event,
        waitUntil: (promise: Promise<void>) => {
          pending = promise;
        },
      });
      await pending;
    },
  };
}

test('each push displays a notification, including an invalid payload fallback', async () => {
  const f = workerFixture();
  await f.emit('push', { data: { json: () => ({ ...intent, title: 'Title', body: 'Preview' }) } });
  assert.equal(f.shown[0]?.title, 'Title');
  assert.equal(f.shown[0]?.options.data.url, `https://connect.test${intent.url}`);
  await f.emit('push', {
    data: {
      json: () => {
        throw new Error('invalid JSON');
      },
    },
  });
  assert.equal(f.shown.length, 2);
  assert.equal(f.shown[1]?.options.data.url, 'https://connect.test/');
});

test('successive messages in the same channel request a fresh OS alert', async () => {
  const f = workerFixture();
  for (const eventId of ['first', 'second']) {
    await f.emit('push', { data: { json: () => ({ ...intent, eventId }) } });
  }
  assert.equal(f.shown.length, 2);
  for (const notification of f.shown) {
    assert.equal(notification.options.tag, channelId);
    assert.equal(notification.options.renotify, true);
  }
});

test('click reuses an existing window and carries the intended account', async () => {
  const f = workerFixture();
  f.addWindow();
  await f.emit('notificationclick', {
    notification: { close() {}, data: { url: intent.url, userId: 'reader' } },
  });
  assert.equal(f.opened.length, 0);
  assert.equal(f.focused.length, 1);
  assert.equal(new URL(f.navigated[0]!).searchParams.get('pushUser'), 'reader');
});

test('an external notification URL cannot open an external site', async () => {
  const f = workerFixture();
  await f.emit('notificationclick', {
    notification: { close() {}, data: { url: 'https://attacker.test/' } },
  });
  assert.deepEqual(f.opened, ['https://connect.test/']);
});
