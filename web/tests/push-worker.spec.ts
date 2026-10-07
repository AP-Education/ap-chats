import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const origin = 'https://connect.test';
const channelId = '5824eb71-b12c-4f48-a30d-e15797b7116b';
const route = `/channels/${channelId}?pushWorkspace=630bba71-6807-445a-9dbe-aad85a050c09`;

type Shown = {
  title: string;
  options: { tag?: string; renotify?: boolean; data: { url: string } };
};

function serviceWorker() {
  const listeners = new Map<string, (event: unknown) => void>();
  const shown: Shown[] = [];
  const opened: string[] = [];
  const steps: string[] = [];
  const pageMessages: unknown[] = [];
  const subscribed: unknown[] = [];
  let windows: unknown[] = [];

  runInNewContext(readFileSync(new URL('../public/push-sw.js', import.meta.url), 'utf8'), {
    URL,
    self: {
      location: { origin },
      addEventListener: (name: string, handler: (event: unknown) => void) =>
        listeners.set(name, handler),
      skipWaiting: async () => steps.push('skip-waiting'),
      registration: {
        showNotification: async (title: string, options: Shown['options']) =>
          shown.push({ title, options }),
        pushManager: { subscribe: async (options: unknown) => subscribed.push(options) },
      },
      clients: {
        matchAll: async () => windows,
        openWindow: async (url: string) => opened.push(url),
        claim: async () => steps.push('claim'),
      },
    },
  });

  return {
    shown,
    opened,
    steps,
    // Plain copies: objects created inside the worker's VM context have another prototype.
    pageMessages: () => JSON.parse(JSON.stringify(pageMessages)),
    subscribed: () => JSON.parse(JSON.stringify(subscribed)),
    openAppWindow: () => {
      windows = [
        {
          url: `${origin}/`,
          focus: async () => steps.push('focus'),
          postMessage: (message: unknown) => {
            steps.push('post');
            pageMessages.push(message);
          },
        },
      ];
    },
    emit: async (name: string, event: object = {}) => {
      let pending: Promise<unknown> = Promise.resolve();
      listeners.get(name)?.({
        ...event,
        waitUntil: (promise: Promise<unknown>) => (pending = promise),
      });
      await pending;
    },
  };
}

const push = (payload: () => unknown) => ({ data: { json: payload } });

test('every push shows a notification that re-alerts within its conversation, even an unreadable one', async () => {
  const worker = serviceWorker();

  await worker.emit(
    'push',
    push(() => ({ title: 'Title', url: route, channelId })),
  );
  await worker.emit(
    'push',
    push(() => ({ title: 'Next', url: route, channelId })),
  );
  await worker.emit(
    'push',
    push(() => {
      throw new Error('invalid JSON');
    }),
  );

  const [first, second, unreadable] = worker.shown;
  assert.equal(first?.options.data.url, `${origin}${route}`);
  assert.deepEqual([first?.options.tag, second?.options.tag], [channelId, channelId]);
  assert.equal(second?.options.renotify, true);
  assert.equal(unreadable?.options.data.url, `${origin}/`);
});

test('a new worker takes over open pages at once, so their clicks reach it', async () => {
  const worker = serviceWorker();

  await worker.emit('install');
  await worker.emit('activate');

  assert.deepEqual(worker.steps, ['skip-waiting', 'claim']);
});

test('a click focuses the open app first, then routes it in-app to the intended account', async () => {
  const worker = serviceWorker();
  worker.openAppWindow();

  await worker.emit('notificationclick', {
    notification: { close() {}, data: { url: route, userId: 'reader' } },
  });

  assert.deepEqual(worker.steps, ['focus', 'post']);
  assert.deepEqual(worker.opened, []);
  const [message] = worker.pageMessages();
  assert.equal(message.type, 'notifications/open');
  assert.equal(new URL(message.url).searchParams.get('pushUser'), 'reader');
});

test('without an open app a click opens one, and never an external site', async () => {
  const worker = serviceWorker();

  await worker.emit('notificationclick', {
    notification: { close() {}, data: { url: 'https://attacker.test/' } },
  });

  assert.deepEqual(worker.opened, [`${origin}/`]);
});

test('a rotated subscription is renewed and open pages are asked to register it', async () => {
  const worker = serviceWorker();
  worker.openAppWindow();

  await worker.emit('pushsubscriptionchange', {
    oldSubscription: { options: { applicationServerKey: 'vapid-key' } },
  });

  assert.deepEqual(worker.subscribed(), [
    { userVisibleOnly: true, applicationServerKey: 'vapid-key' },
  ]);
  assert.deepEqual(worker.pageMessages(), [{ type: 'push/subscription-changed' }]);
});
