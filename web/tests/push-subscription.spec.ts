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

function browser(options: { permission?: NotificationPermission; subscribedWith?: string } = {}) {
  let permission: NotificationPermission = options.permission ?? 'granted';
  let promptAnswer: NotificationPermission = permission;
  let subscribedWith: string | null = options.subscribedWith ?? null;
  let unsubscribeSucceeds = true;
  const storage = new Map<string, string>();
  const events: string[] = [];
  const registrations: string[] = [];
  const removals: string[] = [];

  const subscription = () => ({
    options: {
      applicationServerKey: Uint8Array.from(atob(subscribedWith!), (c) => c.charCodeAt(0)).buffer,
    },
    unsubscribe: async () => {
      events.push('unsubscribe');
      if (unsubscribeSucceeds) subscribedWith = null;
      return unsubscribeSucceeds;
    },
  });

  const dependencies: Record<string, unknown> = {
    './push-api': {
      registerSubscription: async (token: string) => {
        registrations.push(token);
        return { id: 'subscription' };
      },
      removeSubscription: async (token: string) => {
        removals.push(token);
      },
    },
  };
  const exports = {} as typeof PushSubscriptionModule;
  runInNewContext(source, {
    exports,
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
        ready: Promise.resolve({
          pushManager: {
            getSubscription: async () => (subscribedWith ? subscription() : null),
            subscribe: async ({ applicationServerKey }: { applicationServerKey: Uint8Array }) => {
              subscribedWith = btoa(String.fromCharCode(...applicationServerKey));
              events.push('subscribe');
              return subscription();
            },
          },
          getNotifications: async () => [{ close: () => events.push('close notification') }],
        }),
      },
    },
    Notification: {
      get permission() {
        return permission;
      },
      requestPermission: async () => {
        events.push('ask permission');
        permission = promptAnswer;
        return permission;
      },
    },
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });

  return {
    push: exports,
    events,
    registrations,
    removals,
    subscribedWith: () => subscribedWith,
    answerPrompt: (answer: NotificationPermission) => {
      promptAnswer = answer;
    },
    failUnsubscribe: () => {
      unsubscribeSucceeds = false;
    },
  };
}

test('without granted permission synchronizing neither subscribes nor registers', async () => {
  for (const permission of ['default', 'denied'] as const) {
    const b = browser({ permission });
    const result = await b.push.synchronizePush('token', currentKey);
    assert.deepEqual({ ...result }, { permission, subscriptionId: null });
    assert.deepEqual(b.events, []);
    assert.deepEqual(b.registrations, []);
  }
});

test('a subscription the browser lost is recreated and registered again', async () => {
  const b = browser();
  const result = await b.push.synchronizePush('token', currentKey);
  assert.equal(result.subscriptionId, 'subscription');
  assert.deepEqual(b.events, ['subscribe']);
  assert.deepEqual(b.registrations, ['token']);
});

test('a subscription made with a rotated server key is replaced', async () => {
  const b = browser({ subscribedWith: rotatedKey });
  await b.push.synchronizePush('token', currentKey);
  assert.deepEqual(b.events, ['unsubscribe', 'subscribe']);
  assert.equal(b.subscribedWith(), currentKey);
});

test('an existing subscription with the current key is only re-registered', async () => {
  const b = browser({ subscribedWith: currentKey });
  await b.push.synchronizePush('token', currentKey);
  assert.deepEqual(b.events, []);
  assert.deepEqual(b.registrations, ['token']);
});

test('enable asks for permission first, and a dismissed prompt changes nothing', async () => {
  const b = browser({ permission: 'default' });
  const dismissed = await b.push.enablePush('token', currentKey);
  assert.equal(dismissed.permission, 'default');
  assert.deepEqual(b.events, ['ask permission']);

  b.answerPrompt('granted');
  const granted = await b.push.enablePush('token', currentKey);
  assert.equal(granted.subscriptionId, 'subscription');
  assert.deepEqual(b.events, ['ask permission', 'ask permission', 'subscribe']);
});

test('turning push off is remembered, so synchronizing does not quietly turn it back on', async () => {
  const b = browser({ subscribedWith: currentKey });
  await b.push.disablePush('token', 'subscription');
  assert.deepEqual(b.events, ['close notification', 'unsubscribe']);
  assert.deepEqual(b.removals, ['token']);

  const result = await b.push.synchronizePush('token', currentKey);
  assert.equal(result.subscriptionId, null);
  assert.equal(b.subscribedWith(), null);
});

test('a failed browser unsubscribe keeps the server registration and reports the failure', async () => {
  const b = browser({ subscribedWith: currentKey });
  b.failUnsubscribe();
  await assert.rejects(b.push.disablePush('token', 'subscription'), /Unsubscribe failed/);
  assert.deepEqual(b.removals, []);

  const result = await b.push.synchronizePush('token', currentKey);
  assert.equal(result.subscriptionId, 'subscription');
});

test('signing out forgets the owner on the server but keeps the browser subscription', async () => {
  const b = browser({ subscribedWith: currentKey });
  await b.push.releasePush('token', 'subscription');
  assert.deepEqual(b.removals, ['token']);
  assert.equal(b.subscribedWith(), currentKey);
});

test('a release waits for a synchronization already in flight', async () => {
  const b = browser();
  const synchronizing = b.push.synchronizePush('first-token', currentKey);
  const releasing = b.push.releasePush('first-token', 'subscription');
  await Promise.all([synchronizing, releasing]);
  assert.deepEqual(b.registrations, ['first-token']);
  assert.deepEqual(b.removals, ['first-token']);
});
