import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

interface CallKitExports {
  loadCallKitModule: () => Promise<{ registerVoIPPush: () => void } | null>;
}

function load<T>(path: string, dependencies: Record<string, unknown>): T {
  const exports = {};
  const source = ts.transpileModule(readFileSync(resolve(__dirname, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(source, {
    exports,
    __DEV__: false,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return typeof dependencies[name] === 'function' ? dependencies[name]() : dependencies[name];
    },
  });
  return exports as T;
}

test('Expo Go skips the unsupported CallKit bundle and caches the result', async () => {
  let imports = 0;
  const { loadCallKitModule } = load<CallKitExports>(
    '../src/features/calls/utils/callkit-module.ts',
    {
      expo: { requireOptionalNativeModule: () => null },
      'expo-callkit-telecom': () => {
        imports++;
        throw new Error('Unsupported native module');
      },
    },
  );
  const first = loadCallKitModule();
  assert.equal(loadCallKitModule(), first);
  assert.equal(await first, null);
  assert.equal(imports, 0);
});

test('development build loads CallKit once when the native module is available', async () => {
  let imports = 0;
  const sdk = { registerVoIPPush() {} };
  const { loadCallKitModule } = load<CallKitExports>(
    '../src/features/calls/utils/callkit-module.ts',
    {
      expo: { requireOptionalNativeModule: () => ({}) },
      'expo-callkit-telecom': () => {
        imports++;
        return sdk;
      },
    },
  );
  const loaded = await loadCallKitModule();
  assert.ok(loaded);
  assert.equal(loaded.registerVoIPPush, sdk.registerVoIPPush);
  assert.equal(await loadCallKitModule(), loaded);
  assert.equal(imports, 1);
});

test('CallKit initialization failure is caught without crashing the app', async () => {
  const { loadCallKitModule } = load<CallKitExports>(
    '../src/features/calls/utils/callkit-module.ts',
    {
      expo: { requireOptionalNativeModule: () => ({}) },
      'expo-callkit-telecom': () => {
        throw new Error('Native initialization failed');
      },
    },
  );
  assert.equal(await loadCallKitModule(), null);
});

function sessionFixture(callkit: Promise<unknown>, livekit: object = {}) {
  let imports = 0;
  let cleanup: (() => void) | undefined;
  const { CallSession } = load<{ CallSession: () => null }>(
    '../src/features/calls/components/CallSession.tsx',
    {
      react: {
        useEffect: (effect: () => () => void) => {
          cleanup = effect();
        },
      },
      '../store/native-call-store': {},
      '../utils/answer-call': {},
      '../utils/call-metadata': {},
      '../utils/callkit-module': { loadCallKitModule: () => callkit },
      '../utils/end-call': {},
      '../utils/mute-call': {},
      '../utils/session-registry': {},
      '@livekit/react-native': () => {
        imports++;
        if (livekit instanceof Error) throw livekit;
        return livekit;
      },
    },
  );
  return { mount: CallSession, unmount: () => cleanup?.(), imports: () => imports };
}

async function flush() {
  for (let step = 0; step < 8; step++) await Promise.resolve();
}

test('call session does not request a LiveKit bundle when CallKit is unavailable', async () => {
  const f = sessionFixture(Promise.resolve(null));
  f.mount();
  await flush();
  assert.equal(f.imports(), 0);
});

test('unmount during CallKit loading prevents the LiveKit bundle request', async () => {
  let finish!: (value: object) => void;
  const f = sessionFixture(
    new Promise<object>((resolve) => {
      finish = resolve;
    }),
  );
  f.mount();
  f.unmount();
  finish({});
  await flush();
  assert.equal(f.imports(), 0);
});

test('LiveKit bundle failure is caught instead of escaping as an unhandled HMR rejection', async () => {
  const f = sessionFixture(
    Promise.resolve({}),
    new Error('Expected HMRClient.setup() call at startup.'),
  );
  f.mount();
  await flush();
  assert.equal(f.imports(), 1);
});
