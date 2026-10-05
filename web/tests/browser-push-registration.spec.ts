import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type {
  BrowserPushRegistration,
  BrowserPushRegistrationState,
} from '../src/features/devices/browser-push/browser-push-registration';

function fixture() {
  let subscribed = true;
  let permission: NotificationPermission = 'granted';
  let unsubscribeSucceeds = true;
  let register: (token: string) => Promise<{ id: string }> = async () => ({ id: 'subscription' });
  const registrations: string[] = [];
  const removals: string[] = [];
  const events: string[] = [];
  const subscription = {
    unsubscribe: async () => {
      events.push('unsubscribe');
      if (unsubscribeSucceeds) subscribed = false;
      return unsubscribeSucceeds;
    },
  };
  const dependencies: Record<string, unknown> = {
    './browser-subscription': {
      applicationServerKey: () => new Uint8Array(),
      pushRegistration: async () => ({
        pushManager: {
          getSubscription: async () => (subscribed ? subscription : null),
          subscribe: async () => {
            subscribed = true;
            events.push('subscribe');
            return subscription;
          },
        },
        getNotifications: async () => [{ close: () => events.push('close notification') }],
      }),
    },
    './browser-push-api': {
      registerSubscription: (token: string) => {
        registrations.push(token);
        return register(token);
      },
      removeSubscription: async (token: string) => {
        removals.push(token);
      },
    },
  };
  const exports = {} as {
    BrowserPushRegistration: new (
      onStateChange: (changes: Partial<BrowserPushRegistrationState>) => void,
    ) => BrowserPushRegistration;
  };
  const source = ts.transpileModule(
    readFileSync(
      new URL('../src/features/devices/browser-push/browser-push-registration.ts', import.meta.url),
      'utf8',
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
    Notification: {
      get permission() {
        return permission;
      },
      requestPermission: async () => {
        events.push('request permission');
        return permission;
      },
    },
  });
  let state: BrowserPushRegistrationState = {
    subscriptionId: null,
    permission: 'granted',
    busy: false,
    error: null,
  };
  const registration = new exports.BrowserPushRegistration((changes) => {
    state = { ...state, ...changes };
  });
  registration.setAccount({ identity: 'owner-A', token: 'token-A' });

  return {
    registration,
    state: () => state,
    registrations,
    removals,
    events,
    register: (operation: typeof register) => {
      register = operation;
    },
    permission: (value: NotificationPermission) => {
      permission = value;
    },
    failUnsubscribe: () => {
      unsubscribeSucceeds = false;
    },
    subscribed: () => subscribed,
  };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test('account switching cleans an in-flight registration with the original owner token', async () => {
  const f = fixture();
  let finishRegistration!: (result: { id: string }) => void;
  f.register(
    () =>
      new Promise((resolve) => {
        finishRegistration = resolve;
      }),
  );
  const synchronization = f.registration.synchronize();
  await flush();
  assert.deepEqual(f.registrations, ['token-A']);

  f.registration.setAccount({ identity: 'owner-B', token: 'token-B' });
  const nextSynchronization = f.registration.synchronize();
  finishRegistration({ id: 'subscription' });
  await Promise.all([synchronization, nextSynchronization]);

  assert.deepEqual(f.removals, ['token-A']);
  assert.deepEqual(f.registrations, ['token-A']);
  assert.equal(f.subscribed(), false);
  assert.equal(f.state().subscriptionId, null);
});

test('permission is requested immediately from enable and denial never creates a subscription', async () => {
  const f = fixture();
  f.permission('denied');
  const enable = f.registration.enable('vapid');
  assert.deepEqual(f.events, ['request permission']);
  await enable;

  assert.deepEqual(f.registrations, []);
  assert.equal(f.state().permission, 'denied');
  assert.equal(f.state().busy, false);
});

test('a failed synchronization does not block a subsequent retry', async () => {
  const f = fixture();
  f.register(async () => {
    throw new Error('offline');
  });
  await f.registration.synchronize();
  assert.ok(f.state().error);

  f.register(async () => ({ id: 'restored' }));
  await f.registration.synchronize();
  assert.equal(f.state().subscriptionId, 'restored');
  assert.equal(f.state().error, null);
});

test('disable uses refreshed credentials for the same account and closes visible notifications', async () => {
  const f = fixture();
  await f.registration.synchronize();
  f.registration.setAccount({ identity: 'owner-A', token: 'refreshed-token-A' });
  await f.registration.disable();

  assert.deepEqual(f.removals, ['refreshed-token-A']);
  assert.deepEqual(f.events, ['close notification', 'unsubscribe']);
  assert.equal(f.state().subscriptionId, null);
  assert.equal(f.state().busy, false);
});

test('failed browser unsubscribe retains the registered target and reports the failure', async () => {
  const f = fixture();
  await f.registration.synchronize();
  f.failUnsubscribe();
  await f.registration.disable();

  assert.deepEqual(f.removals, []);
  assert.equal(f.state().subscriptionId, 'subscription');
  assert.ok(f.state().error);
  assert.equal(f.state().busy, false);
});

test('returning to the same account before cleanup preserves its subscription', async () => {
  const f = fixture();
  await f.registration.synchronize();
  f.registration.setAccount(null);
  f.registration.setAccount({ identity: 'owner-A', token: 'token-A' });
  await f.registration.synchronize();

  assert.deepEqual(f.removals, []);
  assert.equal(f.subscribed(), true);
  assert.equal(f.state().subscriptionId, 'subscription');
});
