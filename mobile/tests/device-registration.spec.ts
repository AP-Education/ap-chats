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
  const requests: { method: string; session?: string }[] = [];
  const payloads: unknown[] = [];
  let voipToken: string | undefined;
  const persistence = {
    getInstallationId: async () => 'installation',
    getDeviceReleaseKey: async () => 'release-key',
  };
  const push = { getExpoPushToken: async (): Promise<string | undefined> => 'push-token' };
  const api = {
    // The session at the moment of the request: what authorizedFetch would send.
    registerDevice: async (payload?: unknown) => {
      payloads.push(payload);
      requests.push({ method: 'POST', session: accessToken });
      registered = true;
    },
    releaseDevice: async (_installationId: string, releaseKey: string) => {
      assert.equal(releaseKey, 'release-key');
      requests.push({ method: 'RELEASE' });
      registered = false;
    },
    DevicesApiError: class extends Error {},
  };
  const dependencies: Record<string, unknown> = {
    '../../auth': {
      useAuthStore: {
        getState: () =>
          accessToken ? { status: 'signed-in', tokens: { accessToken } } : { status: 'signed-out' },
      },
    },
    './devices-api': api,
    './installation-id': persistence,
    './push-token': push,
    'expo-constants': { default: { expoConfig: { extra: { apnsEnvironment: 'sandbox' } } } },
    'react-native': { Platform: { OS: 'ios' } },
    '../../calls/utils/callkit-module': {
      loadCallKitModule: async () => ({
        getVoIPPushToken: () => (voipToken ? { token: voipToken } : undefined),
      }),
    },
  };
  function load<T>(path: string): T {
    const exports = {};
    const source = ts.transpileModule(
      readFileSync(resolve(__dirname, '../src/features/push', path), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText;
    runInNewContext(source, {
      exports,
      process: { env: { EXPO_PUBLIC_APNS_ENVIRONMENT: 'sandbox' } },
      require: (name: string) => {
        assert.ok(name in dependencies, `Unexpected import: ${name}`);
        return dependencies[name];
      },
    });
    return exports as T;
  }
  dependencies['../utils/device-registration-queue'] = load('utils/device-registration-queue.ts');
  const registering = load<{
    registerCurrentDeviceForPush: () => Promise<void>;
    forgetCurrentDeviceRegistration: () => void;
  }>('api/register-current-device.ts');
  dependencies['./register-current-device'] = registering;
  const register = registering.registerCurrentDeviceForPush;
  const { releaseCurrentDevice: release } = load<{
    releaseCurrentDevice: () => Promise<void>;
  }>('api/release-current-device.ts');

  return {
    api,
    payloads,
    setVoipToken: (token: string) => {
      voipToken = token;
    },
    persistence,
    push,
    requests,
    register,
    release,
    registered: () => registered,
    setRegistered: (value: boolean) => {
      registered = value;
    },
    setAccessToken: (value: string | undefined) => {
      accessToken = value;
    },
  };
}

test('a delayed release finishes before a new sign-in registers the same device', async () => {
  const f = fixture();
  const deleting = deferred();
  const started = deferred();
  f.api.releaseDevice = async () => {
    f.requests.push({ method: 'RELEASE' });
    started.resolve();
    await deleting.promise;
    f.setRegistered(false);
  };
  const logoutCleanup = f.release();
  f.setAccessToken(undefined);
  await started.promise;
  f.setAccessToken('new-session');
  const registration = f.register();
  await Promise.resolve();
  assert.deepEqual(f.requests, [{ method: 'RELEASE' }]);
  deleting.resolve();
  await Promise.all([logoutCleanup, registration]);
  assert.deepEqual(f.requests, [{ method: 'RELEASE' }, { method: 'POST', session: 'new-session' }]);
  assert.equal(f.registered(), true);
});

test('cleanup is reserved before an asynchronous installation lookup completes', async () => {
  const f = fixture();
  const lookup = deferred();
  f.persistence.getInstallationId = async () => {
    await lookup.promise;
    return 'installation';
  };
  const cleanup = f.release();
  f.setAccessToken(undefined);
  f.setAccessToken('new-session');
  const registration = f.register();
  lookup.resolve();
  await Promise.all([cleanup, registration]);
  assert.deepEqual(f.requests, [{ method: 'RELEASE' }, { method: 'POST', session: 'new-session' }]);
});

test('a release follows an already pending POST so it cannot restore push after logout', async () => {
  const f = fixture();
  const posting = deferred();
  const started = deferred();
  f.api.registerDevice = async () => {
    f.requests.push({ method: 'POST', session: 'old-session' });
    started.resolve();
    await posting.promise;
    f.setRegistered(true);
  };
  const registration = f.register();
  await started.promise;
  const cleanup = f.release();
  f.setAccessToken(undefined);
  posting.resolve();
  await Promise.all([registration, cleanup]);
  assert.deepEqual(f.requests, [{ method: 'POST', session: 'old-session' }, { method: 'RELEASE' }]);
  assert.equal(f.registered(), false);
});

test('a queued registration is skipped if logout cleared the session before it runs', async () => {
  const f = fixture();
  const cleanup = f.release();
  const registration = f.register();
  f.setAccessToken(undefined);
  await Promise.all([cleanup, registration]);
  assert.deepEqual(f.requests, [{ method: 'RELEASE' }]);
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
  const cleanup = f.release();
  f.setAccessToken(undefined);
  lookup.resolve();
  await Promise.all([registration, cleanup]);
  assert.deepEqual(f.requests, [{ method: 'RELEASE' }]);
});

test('a failed cleanup does not prevent a subsequent device registration', async () => {
  const f = fixture();
  f.persistence.getInstallationId = async () => {
    throw new Error('SecureStore unavailable');
  };
  const cleanup = f.release();
  await assert.rejects(cleanup, /SecureStore unavailable/);
  f.persistence.getInstallationId = async () => 'installation';
  f.setAccessToken('new-session');
  await f.register();
  assert.deepEqual(f.requests, [{ method: 'POST', session: 'new-session' }]);
});

test('VoIP registers independently when ordinary notification permission is denied', async () => {
  const f = fixture();
  f.push.getExpoPushToken = async () => undefined;
  f.setVoipToken('voip-token');
  await f.register();
  assert.equal(f.requests.length, 1);
  assert.equal((f.payloads[0] as { voipToken: string }).voipToken, 'voip-token');
  assert.equal((f.payloads[0] as { apnsEnvironment: string }).apnsEnvironment, 'sandbox');
});

test('transient Expo token failure still registers VoIP and remains retryable', async () => {
  const f = fixture();
  f.setVoipToken('voip-token');
  f.push.getExpoPushToken = async () => {
    throw new Error('Expo temporarily unavailable');
  };
  await assert.rejects(f.register(), /Expo temporarily unavailable/);
  assert.equal((f.payloads[0] as { voipToken: string }).voipToken, 'voip-token');
  assert.equal((f.payloads[0] as { pushToken?: string }).pushToken, undefined);
  f.push.getExpoPushToken = async () => 'recovered-token';
  await f.register();
  assert.equal((f.payloads[1] as { pushToken: string }).pushToken, 'recovered-token');
});

test('requests arriving together make one registration, an unchanged one makes none', async () => {
  const f = fixture();

  await Promise.all([f.register(), f.register(), f.register(), f.register()]);
  await f.register();
  assert.deepEqual(f.requests, [{ method: 'POST', session: 'old-session' }]);

  f.push.getExpoPushToken = async () => 'rotated-token';
  await f.register();
  assert.equal(f.requests.length, 2, 'a rotated push token is news');
});

test('a released phone registers afresh for whoever signs in next', async () => {
  const f = fixture();
  await f.register();
  await f.release();

  f.setAccessToken('new-session');
  await f.register();

  assert.deepEqual(f.requests, [
    { method: 'POST', session: 'old-session' },
    { method: 'RELEASE' },
    { method: 'POST', session: 'new-session' },
  ]);
});

test('a failed registration is not remembered, so the next request sends it again', async () => {
  const f = fixture();
  const register = f.api.registerDevice;
  f.api.registerDevice = async () => {
    throw new Error('Network request failed');
  };
  await assert.rejects(f.register(), /Network request failed/);

  f.api.registerDevice = register;
  await f.register();
  assert.deepEqual(f.requests, [{ method: 'POST', session: 'old-session' }]);
});
