import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(resolve(__dirname, '../src/features/push/components/PushRegistration.tsx'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

function signedInScreen() {
  const state = { status: 'signed-in' };
  const registrations: unknown[] = [];
  const tokenListeners: ((token: { data: string }) => void)[] = [];
  const previousDeps: unknown[][] = [];

  const render = () => {
    let effectIndex = 0;
    const dependencies: Record<string, unknown> = {
      react: {
        useEffect: (effect: () => void, deps: unknown[]) => {
          const index = effectIndex++;
          const changed = previousDeps[index]?.some((value, i) => value !== deps[i]) ?? true;
          previousDeps[index] = deps;
          if (changed) effect();
        },
      },
      'expo-notifications': {
        addPushTokenListener: (listener: (token: { data: string }) => void) => {
          tokenListeners.push(listener);
          return { remove() {} };
        },
      },
      'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
      '../../auth': { useAuthStore: (select: (value: typeof state) => unknown) => select(state) },
      '../../calls/utils/callkit-module': { loadCallKitModule: async () => null },
      '../api/register-current-device': {
        registerCurrentDeviceForPush: async (devicePushToken?: unknown) => {
          registrations.push(devicePushToken);
        },
      },
    };
    const exports = {} as { PushRegistration: () => null };
    runInNewContext(source, {
      exports,
      setTimeout,
      clearTimeout,
      require: (name: string) => {
        assert.ok(name in dependencies, `Unexpected import: ${name}`);
        return dependencies[name];
      },
    });
    exports.PushRegistration();
  };
  render();

  return {
    registrations,
    reportPushToken: (data: string) => tokenListeners.forEach((listener) => listener({ data })),
  };
}

test('the push token every token request reports registers once, not again and again', () => {
  const s = signedInScreen();
  const opening = s.registrations.length;

  s.reportPushToken('device-token');
  s.reportPushToken('device-token');
  s.reportPushToken('device-token');
  assert.deepEqual(s.registrations.slice(opening), [{ data: 'device-token' }]);

  s.reportPushToken('rotated-token');
  assert.deepEqual(s.registrations.slice(opening + 1), [{ data: 'rotated-token' }]);
});

const sessionEndSource = ts.transpileModule(
  readFileSync(resolve(__dirname, '../src/features/push/background/session-end.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

/** The session as the auth store reports it, with no screen mounted at all. */
function sessionWithoutScreens() {
  let state = { status: 'signed-in' };
  let releases = 0;
  let dismissals = 0;
  const listeners: ((next: typeof state, previous: typeof state) => void)[] = [];
  runInNewContext(sessionEndSource, {
    exports: {},
    require: (name: string) =>
      ({
        '../../auth': {
          useAuthStore: {
            subscribe: (listener: (next: typeof state, previous: typeof state) => void) =>
              listeners.push(listener),
          },
        },
        '../api/presented-notifications': {
          dismissPresentedNotifications: async () => {
            dismissals += 1;
          },
        },
        '../api/release-current-device': {
          releaseCurrentDevice: async () => {
            releases += 1;
          },
        },
      })[name],
  });

  return {
    releases: () => releases,
    dismissals: () => dismissals,
    become: (status: string) => {
      const previous = state;
      state = { status };
      listeners.forEach((listener) => listener(state, previous));
    },
  };
}

test('a refused renewal releases the device and clears its previews, with no screen up', () => {
  const s = sessionWithoutScreens();
  s.become('signed-in');
  assert.equal(s.releases(), 0, 'a renewal is not an ending');

  s.become('signed-out');
  assert.equal(s.releases(), 1);
  assert.equal(s.dismissals(), 1, 'previews of the ended account leave the screen');
});

test('a logout releases once, however many states it passes through', () => {
  const s = sessionWithoutScreens();
  s.become('signing-out');
  s.become('signed-out');
  assert.equal(s.releases(), 1);
});
