import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type { pushTarget as PushTarget } from '../src/features/notifications/push-target';

const channelId = '5824eb71-b12c-4f48-a30d-e15797b7116b';
const workspaceId = '630bba71-6807-445a-9dbe-aad85a050c09';
const intent = {
  eventId: 'event',
  userId: 'user',
  channelId,
  workspaceId,
  url: `/channels/${channelId}?pushWorkspace=${workspaceId}`,
};

function loadPushTarget(): typeof PushTarget {
  const exports = {} as { pushTarget: typeof PushTarget };
  const source = ts.transpileModule(
    readFileSync(new URL('../src/features/notifications/push-target.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  runInNewContext(source, {
    exports,
    URL,
    window: { location: { origin: 'https://connect.test' } },
  });
  return exports.pushTarget;
}

test('a notification opens only a conversation route of this app', () => {
  const pushTarget = loadPushTarget();
  assert.equal(pushTarget(intent.url), intent.url);
  assert.equal(
    pushTarget(`https://connect.test${intent.url}&pushUser=reader`),
    `${intent.url}&pushUser=reader`,
  );
  for (const url of [
    'https://attacker.test/',
    '//attacker.test/',
    '/auth/callback',
    `/channels/${channelId}?pushWorkspace=another-workspace`,
    `/channels/${channelId}`,
    42,
  ]) {
    assert.equal(pushTarget(url), null);
  }
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
  const steps: string[] = [];
  const pageMessages: unknown[] = [];
  const subscribed: unknown[] = [];
  let windows: unknown[] = [];
  const self = {
    location: { origin: 'https://connect.test' },
    addEventListener: (name: string, handler: (event: unknown) => void) =>
      listeners.set(name, handler),
    skipWaiting: async () => {
      steps.push('skip-waiting');
    },
    registration: {
      showNotification: async (title: string, options: NotificationOptions) => {
        shown.push({ title, options });
      },
      pushManager: {
        subscribe: async (options: unknown) => {
          subscribed.push(options);
        },
      },
    },
    clients: {
      matchAll: async () => windows,
      openWindow: async (url: string) => {
        opened.push(url);
      },
      claim: async () => {
        steps.push('claim');
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
    steps,
    pageMessages,
    subscribed,
    addWindow: () => {
      windows = [
        {
          url: 'https://connect.test/',
          focus: async () => {
            steps.push('focus');
          },
          postMessage: (message: unknown) => {
            steps.push('post');
            pageMessages.push(message);
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

test('a new worker takes over open pages so their clicks reach it', async () => {
  const f = workerFixture();
  await f.emit('install', {});
  await f.emit('activate', {});
  assert.deepEqual(f.steps, ['skip-waiting', 'claim']);
});

test('click focuses an existing window first, then routes it in-app to the intended account', async () => {
  const f = workerFixture();
  f.addWindow();
  await f.emit('notificationclick', {
    notification: { close() {}, data: { url: intent.url, userId: 'reader' } },
  });
  assert.equal(f.opened.length, 0);
  assert.deepEqual(f.steps, ['focus', 'post']);
  const message = f.pageMessages[0] as { type: string; url: string };
  assert.equal(message.type, 'notifications/open');
  assert.equal(new URL(message.url).searchParams.get('pushUser'), 'reader');
});

test('a rotated subscription is renewed and open pages are asked to register it', async () => {
  const f = workerFixture();
  f.addWindow();
  await f.emit('pushsubscriptionchange', {
    oldSubscription: { options: { applicationServerKey: 'vapid-key' } },
  });
  // Plain copies: objects created inside the worker's VM context have another prototype.
  assert.deepEqual(JSON.parse(JSON.stringify(f.subscribed)), [
    { userVisibleOnly: true, applicationServerKey: 'vapid-key' },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(f.pageMessages)), [
    { type: 'push/subscription-changed' },
  ]);
});

test('an external notification URL cannot open an external site', async () => {
  const f = workerFixture();
  await f.emit('notificationclick', {
    notification: { close() {}, data: { url: 'https://attacker.test/' } },
  });
  assert.deepEqual(f.opened, ['https://connect.test/']);
});
