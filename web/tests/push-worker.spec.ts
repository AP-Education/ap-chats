import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const origin = 'https://connect.test';
const target = { type: 'conversation', channelId: 'channel' };

type Shown = {
  title: string;
  options: { tag?: string; renotify?: boolean; data: { userId?: string; target?: unknown } };
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
    push(() => ({ title: 'Title', userId: 'reader', collapseKey: 'channel', target })),
  );
  await worker.emit(
    'push',
    push(() => ({ title: 'Next', userId: 'reader', collapseKey: 'channel', target })),
  );
  await worker.emit(
    'push',
    push(() => {
      throw new Error('invalid JSON');
    }),
  );

  const [first, second, unreadable] = worker.shown;
  assert.deepEqual(JSON.parse(JSON.stringify(first?.options.data)), { userId: 'reader', target });
  assert.deepEqual([first?.options.tag, second?.options.tag], ['channel', 'channel']);
  assert.equal(second?.options.renotify, true);
  assert.equal(unreadable?.options.tag, 'ap-connect');
});

test('a new worker takes over open pages at once, so their clicks reach it', async () => {
  const worker = serviceWorker();

  await worker.emit('install');
  await worker.emit('activate');

  assert.deepEqual(worker.steps, ['skip-waiting', 'claim']);
});

test('a click focuses the open app first, then hands it the tap to route in-app', async () => {
  const worker = serviceWorker();
  worker.openAppWindow();

  await worker.emit('notificationclick', {
    notification: { close() {}, data: { userId: 'reader', target } },
  });

  assert.deepEqual(worker.steps, ['focus', 'post']);
  assert.deepEqual(worker.opened, []);
  assert.deepEqual(worker.pageMessages(), [
    { type: 'notifications/open', userId: 'reader', target },
  ]);
});

test('without an open app a click starts the app at home with the tap', async () => {
  const worker = serviceWorker();

  await worker.emit('notificationclick', {
    notification: { close() {}, data: { userId: 'reader', target } },
  });

  const opened = new URL(worker.opened[0]!, origin);
  assert.equal(opened.pathname, '/');
  assert.deepEqual(JSON.parse(opened.searchParams.get('notification')!), {
    userId: 'reader',
    target,
  });
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
