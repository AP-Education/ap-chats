import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function fixture() {
  let accessToken: string | undefined = 'old-session';
  let registered = true;
  const requests: { method: string; accessToken: string }[] = [];
  const persistence = { getInstallationId: async () => 'installation' };
  const push = { getExpoPushToken: async (): Promise<string | undefined> => 'push-token' };
  const api = {
    registerDevice: async (accessToken: string) => {
      requests.push({ method: 'POST', accessToken });
      registered = true;
    },
    unregisterDevice: async (accessToken: string) => {
      requests.push({ method: 'DELETE', accessToken });
      registered = false;
    },
    DevicesApiError: class extends Error {},
  };
  const dependencies: Record<string, unknown> = {
    '../../auth': {
      useAuthStore: {
        getState: () =>
          accessToken
            ? { status: 'signed-in', tokens: { accessToken }, refreshNow: async () => {} }
            : { status: 'signed-out' },
      },
    },
    './devices-api': api,
    './installation-id': persistence,
    './push-token': push,
    'react-native': { Platform: { OS: 'ios' } },
    '../../calls/utils/callkit-module': { loadCallKitModule: async () => undefined },
  };
  function load<T>(path: string): T {
    const exports = {};
    const source = ts.transpileModule(
      readFileSync(resolve(__dirname, '../src/features/push', path), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText;
    runInNewContext(source, {
      exports,
      require: (name: string) => {
        assert.ok(name in dependencies, `Unexpected import: ${name}`);
        return dependencies[name];
      },
    });
    return exports as T;
  }
  dependencies['../utils/device-registration-queue'] = load('utils/device-registration-queue.ts');
  const { registerCurrentDeviceForPush: register } = load<{
    registerCurrentDeviceForPush: () => Promise<void>;
  }>('api/register-current-device.ts');
  const { unregisterCurrentDevice: unregister } = load<{
    unregisterCurrentDevice: () => Promise<void>;
  }>('api/unregister-current-device.ts');

  return {
    api,
    persistence,
    push,
    requests,
    register,
    unregister,
    registered: () => registered,
    setRegistered: (value: boolean) => {
      registered = value;
    },
    setAccessToken: (value: string | undefined) => {
      accessToken = value;
    },
  };
}

test('a delayed logout DELETE finishes before a new sign-in registers the same device', async () => {
  const f = fixture();
  const deleting = deferred();
  const started = deferred();
  f.api.unregisterDevice = async (accessToken) => {
    f.requests.push({ method: 'DELETE', accessToken });
    started.resolve();
    await deleting.promise;
    f.setRegistered(false);
  };
  const logoutCleanup = f.unregister();
  f.setAccessToken(undefined);
  await started.promise;
  f.setAccessToken('new-session');
  const registration = f.register();
  await Promise.resolve();
  assert.deepEqual(f.requests, [{ method: 'DELETE', accessToken: 'old-session' }]);
  deleting.resolve();
  await Promise.all([logoutCleanup, registration]);
  assert.deepEqual(f.requests, [
    { method: 'DELETE', accessToken: 'old-session' },
    { method: 'POST', accessToken: 'new-session' },
  ]);
  assert.equal(f.registered(), true);
});

test('cleanup is reserved before an asynchronous installation lookup completes', async () => {
  const f = fixture();
  const lookup = deferred();
  f.persistence.getInstallationId = async () => {
    await lookup.promise;
    return 'installation';
  };
  const cleanup = f.unregister();
  f.setAccessToken(undefined);
  f.setAccessToken('new-session');
  const registration = f.register();
  lookup.resolve();
  await Promise.all([cleanup, registration]);
  assert.deepEqual(f.requests, [
    { method: 'DELETE', accessToken: 'old-session' },
    { method: 'POST', accessToken: 'new-session' },
  ]);
});

test('logout cleanup follows an already pending POST so it cannot restore push after logout', async () => {
  const f = fixture();
  const posting = deferred();
  const started = deferred();
  f.api.registerDevice = async (accessToken) => {
    f.requests.push({ method: 'POST', accessToken });
    started.resolve();
    await posting.promise;
    f.setRegistered(true);
  };
  const registration = f.register();
  await started.promise;
  const cleanup = f.unregister();
  f.setAccessToken(undefined);
  posting.resolve();
  await Promise.all([registration, cleanup]);
  assert.deepEqual(f.requests, [
    { method: 'POST', accessToken: 'old-session' },
    { method: 'DELETE', accessToken: 'old-session' },
  ]);
  assert.equal(f.registered(), false);
});

test('a queued registration is skipped if logout cleared the session before it runs', async () => {
  const f = fixture();
  const cleanup = f.unregister();
  const registration = f.register();
  f.setAccessToken(undefined);
  await Promise.all([cleanup, registration]);
  assert.deepEqual(f.requests, [{ method: 'DELETE', accessToken: 'old-session' }]);
});

test('logout during push-token lookup prevents a stale registration POST', async () => {
  const f = fixture();
  const lookup = deferred();
  const started = deferred();
  f.push.getExpoPushToken = async () => {
    started.resolve();
    await lookup.promise;
    return 'push-token';
  };
  const registration = f.register();
  await started.promise;
  const cleanup = f.unregister();
  f.setAccessToken(undefined);
  lookup.resolve();
  await Promise.all([registration, cleanup]);
  assert.deepEqual(f.requests, [{ method: 'DELETE', accessToken: 'old-session' }]);
});

test('a failed cleanup does not prevent a subsequent device registration', async () => {
  const f = fixture();
  f.persistence.getInstallationId = async () => {
    throw new Error('SecureStore unavailable');
  };
  const cleanup = f.unregister();
  await assert.rejects(cleanup, /SecureStore unavailable/);
  f.persistence.getInstallationId = async () => 'installation';
  f.setAccessToken('new-session');
  await f.register();
  assert.deepEqual(f.requests, [{ method: 'POST', accessToken: 'new-session' }]);
});
