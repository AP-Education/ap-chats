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
    process: { env: { EXPO_PUBLIC_API_URL: 'https://api.test' } },
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

function sessionFixture(
  callkit: Promise<unknown>,
  livekit: object = {},
  dependencies: Record<string, unknown> = {},
) {
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
      '../utils/hydrate-call-session': {},
      '../utils/synchronize-call-session': {},
      '@livekit/react-native': () => {
        imports++;
        if (livekit instanceof Error) throw livekit;
        return livekit;
      },
      ...dependencies,
    },
  );
  return { mount: CallSession, unmount: () => cleanup?.(), imports: () => imports };
}

async function flush() {
  for (let step = 0; step < 8; step++) await Promise.resolve();
}

test('call signals dismiss other-device rings without ending the call being answered locally', async () => {
  const listeners = new Map<string, (payload: unknown) => void>();
  const ended: string[] = [];
  const call = { sessionId: 'native-session', status: 'ringing' };
  const { CallSignalSocket } = load<{ CallSignalSocket: () => null }>(
    '../src/features/calls/components/CallSignalSocket.tsx',
    {
      react: { useEffect: (effect: () => void) => effect() },
      'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
      'socket.io-client': {
        io: () => ({
          on: (event: string, handler: (payload: unknown) => void) => listeners.set(event, handler),
        }),
      },
      '../../auth': { useAuthStore: () => 'signed-in' },
      '../store/native-call-store': { useNativeCallStore: { getState: () => ({ call }) } },
      '../utils/callkit-module': {
        loadCallKitModule: async () => ({
          reportCallEnded: async (id: string) => {
            ended.push(id);
          },
        }),
      },
      '../utils/require-access-token': {},
      '../utils/session-registry': {
        findTrackedSessionIdByServerCallId: (id: string) =>
          id === 'server-call' ? call.sessionId : undefined,
      },
      '../utils/synchronize-call-session': {},
    },
  );
  CallSignalSocket();
  listeners.get('call:accepted')?.({ callId: 'server-call' });
  await flush();
  assert.deepEqual(ended, ['native-session']);

  ended.length = 0;
  for (const status of ['connecting', 'connected']) {
    call.status = status;
    listeners.get('call:accepted')?.({ callId: 'server-call' });
  }
  listeners.get('call:ended')?.({ callId: 'another-call' });
  listeners.get('call:ended')?.({ callId: null });
  await flush();
  assert.deepEqual(ended, []);

  for (const event of ['call:ended', 'call:declined', 'call:missed']) {
    listeners.get(event)?.({ callId: 'server-call' });
  }
  await flush();
  assert.deepEqual(ended, ['native-session', 'native-session', 'native-session']);
});

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

test('cold bootstrap registers CallKit-owned audio before replay and handles system endings locally', async () => {
  const steps: string[] = [];
  const listeners = new Map<string, (event: unknown) => void>();
  const listen = (name: string) => (listener: (event: unknown) => void) => {
    listeners.set(name, listener);
    if (name === 'answered') listener({ id: 'cold-call', requestId: 'answer-request' });
    return { remove: () => {} };
  };
  const CallKit = {
    addCallSessionAddedListener: listen('added'),
    addIncomingCallReportedListener: listen('incoming'),
    addCallAnsweredListener: listen('answered'),
    addCallEndedListener: listen('ended'),
    addReportedCallEndedListener: listen('reported-ended'),
    addCallSessionRemovedListener: listen('removed'),
    addSetMutedActionListener: listen('muted'),
  };
  const f = sessionFixture(
    Promise.resolve(CallKit),
    {
      registerGlobals: (options: { autoConfigureAudioSession: boolean }) => {
        assert.equal(options.autoConfigureAudioSession, false);
        steps.push('media-globals');
      },
    },
    {
      '../utils/answer-call': {
        answerCall: async () => {
          steps.push('answer-replay');
        },
      },
      '../utils/hydrate-call-session': {
        hydrateCallSession: async () => {
          steps.push('hydrate');
        },
      },
      '../utils/synchronize-call-session': { synchronizeCallSession: async () => {} },
      '../utils/end-call': {
        endCallSession: async (_event: unknown, options?: { notifyServer: boolean }) => {
          steps.push(options?.notifyServer === false ? 'local-cleanup' : 'notify-server');
        },
      },
    },
  );
  f.mount();
  await flush();
  assert.deepEqual(steps, ['media-globals', 'answer-replay', 'hydrate']);

  // Only the user's own hang-up tells the server; system and remote endings are local cleanup.
  listeners.get('reported-ended')?.({ id: 'cold-call' });
  listeners.get('removed')?.({ id: 'cold-call' });
  listeners.get('ended')?.({ id: 'cold-call' });
  assert.deepEqual(steps.slice(3), ['local-cleanup', 'local-cleanup', 'notify-server']);
  f.unmount();
});
