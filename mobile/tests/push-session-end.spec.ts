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

function session() {
  let state: { status: string; tokens?: { accessToken: string } } = {
    status: 'signed-in',
    tokens: { accessToken: 'first-token' },
  };
  const unregistered: string[] = [];
  let dismissals = 0;
  const refs: { current: unknown }[] = [];
  const previousDeps: unknown[][] = [];

  const render = () => {
    let refIndex = 0;
    let effectIndex = 0;
    const dependencies: Record<string, unknown> = {
      react: {
        useRef: (initial: unknown) => (refs[refIndex++] ??= { current: initial }),
        useEffect: (effect: () => void, deps: unknown[]) => {
          const index = effectIndex++;
          const changed = previousDeps[index]?.some((value, i) => value !== deps[i]) ?? true;
          previousDeps[index] = deps;
          if (changed) effect();
        },
      },
      'expo-notifications': { addPushTokenListener: () => ({ remove() {} }) },
      'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
      '../../auth': { useAuthStore: (select: (value: typeof state) => unknown) => select(state) },
      '../../calls/utils/callkit-module': { loadCallKitModule: async () => null },
      '../api/register-current-device': { registerCurrentDeviceForPush: async () => {} },
      '../api/presented-notifications': {
        dismissPresentedNotifications: async () => {
          dismissals += 1;
        },
      },
      '../api/unregister-current-device': {
        unregisterCurrentDevice: async (token: string) => {
          unregistered.push(token);
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
    unregistered,
    dismissals: () => dismissals,
    refreshToken: (accessToken: string) => {
      state = { status: 'signed-in', tokens: { accessToken } };
      render();
    },
    end: (status: string) => {
      state = { status };
      render();
    },
  };
}

test('a forced sign-out after a failed refresh unregisters the device with the ending token', () => {
  const s = session();
  s.refreshToken('refreshed-token');
  assert.deepEqual(s.unregistered, []);

  s.end('signed-out');
  assert.deepEqual(s.unregistered, ['refreshed-token']);
  assert.equal(s.dismissals(), 1, 'previews of the ended account leave the screen');
});

test('a normal logout unregisters once, however many states it passes through', () => {
  const s = session();
  s.end('signing-out');
  s.end('signed-out');
  assert.deepEqual(s.unregistered, ['first-token']);
});
