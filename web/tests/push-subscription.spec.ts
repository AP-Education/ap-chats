import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type * as PushSubscriptionModule from '../src/features/notifications/api/push-subscription';

const source = ts.transpileModule(
  readFileSync(
    new URL('../src/features/notifications/api/push-subscription.ts', import.meta.url),
    'utf8',
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

const currentKey = btoa('current-key');
const rotatedKey = btoa('rotated-key');

/** One browser profile: its permission, its push subscription and what reached our API. */
function browser({
  permission = 'granted' as NotificationPermission,
  subscribedWith = null as string | null,
} = {}) {
  let promptAnswer = permission;
  const storage = new Map<string, string>();
  const events: string[] = [];
  const registrations: string[] = [];
  const removals: string[] = [];
  let shown = 1;

  const subscription = () => ({
    options: {
      applicationServerKey: Uint8Array.from(atob(subscribedWith!), (c) => c.charCodeAt(0)).buffer,
    },
    unsubscribe: async () => {
      events.push('unsubscribe');
      subscribedWith = null;
      return true;
    },
  });

  const registration = {
    pushManager: {
      getSubscription: async () => (subscribedWith ? subscription() : null),
      subscribe: async ({ applicationServerKey }: { applicationServerKey: Uint8Array }) => {
        subscribedWith = btoa(String.fromCharCode(...applicationServerKey));
        events.push('subscribe');
        return subscription();
      },
    },
  };

  const push = {} as typeof PushSubscriptionModule;
  runInNewContext(source, {
    exports: push,
    atob,
    Uint8Array,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    navigator: {
      serviceWorker: {
        register: async () => undefined,
        ready: Promise.resolve(registration),
      },
    },
    Notification: {
      get permission() {
        return permission;
      },
      requestPermission: async () => {
        events.push('ask permission');
        return (permission = promptAnswer);
      },
    },
    require: (name: string) =>
      ({
        './push-api': {
          registerSubscription: async (token: string) => {
            registrations.push(token);
            return { id: 'subscription' };
          },
          removeSubscription: async (token: string) => removals.push(token),
        },
        './shown-notifications': {
          dismissNotifications: async () => {
            shown = 0;
          },
        },
      })[name],
  });

  return {
    shown: () => shown,
    push,
    events,
    registrations,
    removals,
    subscribedWith: () => subscribedWith,
    answerPrompt: (answer: NotificationPermission) => (promptAnswer = answer),
  };
}

test('without granted permission synchronizing touches neither the browser nor our API', async () => {
  for (const permission of ['default', 'denied'] as const) {
    const b = browser({ permission });

    const result = await b.push.synchronizePush('token', currentKey, '/c/');

    assert.equal(result.subscriptionId, null);
    assert.deepEqual([b.events, b.registrations], [[], []]);
  }
});

test('synchronizing restores exactly one subscription with the current server key', async () => {
  const cases = [
    { name: 'lost', subscribedWith: null, events: ['subscribe'] },
    { name: 'rotated key', subscribedWith: rotatedKey, events: ['unsubscribe', 'subscribe'] },
    { name: 'current', subscribedWith: currentKey, events: [] },
  ];

  for (const { name, subscribedWith, events } of cases) {
    const b = browser({ subscribedWith });

    const result = await b.push.synchronizePush('token', currentKey, '/c/');

    assert.deepEqual(b.events, events, name);
    assert.equal(b.subscribedWith(), currentKey, name);
    assert.equal(result.subscriptionId, 'subscription', name);
  }
});

test('enabling asks for permission first, and a dismissed prompt subscribes nothing', async () => {
  const b = browser({ permission: 'default' });

  await b.push.enablePush('token', currentKey, '/c/');
  assert.deepEqual(b.events, ['ask permission']);

  b.answerPrompt('granted');
  const granted = await b.push.enablePush('token', currentKey, '/c/');

  assert.equal(granted.subscriptionId, 'subscription');
  assert.deepEqual(b.events, ['ask permission', 'ask permission', 'subscribe']);
});

test('turning push off is remembered, so synchronizing does not quietly turn it back on', async () => {
  const b = browser({ subscribedWith: currentKey });

  await b.push.disablePush('token', 'subscription', '/c/');
  const result = await b.push.synchronizePush('token', currentKey, '/c/');

  assert.deepEqual(b.removals, ['token']);
  assert.equal(result.subscriptionId, null);
  assert.equal(b.subscribedWith(), null);
});

test('signing out forgets the owner on the server but keeps the browser subscription', async () => {
  const b = browser({ subscribedWith: currentKey });

  await b.push.releasePush('token', 'subscription');

  assert.deepEqual(b.removals, ['token']);
  assert.equal(b.subscribedWith(), currentKey);
  assert.equal(b.shown(), 0, 'the previous account leaves no previews behind');
});

test('a sign-out waits for a synchronization already in flight', async () => {
  const b = browser();

  await Promise.all([
    b.push.synchronizePush('first-token', currentKey, '/c/'),
    b.push.releasePush('first-token', 'subscription'),
  ]);

  assert.deepEqual([b.registrations, b.removals], [['first-token'], ['first-token']]);
});
