import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

interface AudioMode {
  playsInSilentMode: boolean;
  interruptionMode: string;
}

type PlayerOperation = ['mode', AudioMode] | ['seek', number] | ['play'];
interface HookSlot {
  current?: unknown;
  deps?: readonly unknown[];
  cleanup?: (() => void) | void;
}

type SoundModule = { MessageNotificationSound: (props: { request: number }) => null };
type WebSoundModule = { playMessageBloop: () => void };

function load<T>(
  path: string,
  dependencies: Record<string, unknown>,
  globals: Record<string, unknown> = {},
): T {
  const exports = {};
  const source = ts.transpileModule(readFileSync(resolve(__dirname, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return exports as T;
}

function fixture() {
  const appState = { currentState: 'active' };
  const store: { call: { status: 'connecting' | 'connected' } | null } = { call: null };
  const operations: PlayerOperation[] = [];
  const slots: HookSlot[] = [];
  let cursor = 0;
  const status = { isLoaded: true, error: null };
  let mode = async () => {};
  let seek = async () => {};
  const player = {
    async seekTo(time: number) {
      operations.push(['seek', time]);
      await seek();
    },
    play() {
      operations.push(['play']);
    },
  };
  const { MessageNotificationSound } = load<SoundModule>(
    '../src/features/push/components/MessageNotificationSound.tsx',
    {
      'expo-audio': {
        useAudioPlayer: (
          _source: unknown,
          options: { keepAudioSessionActive: boolean; downloadFirst: boolean },
        ) => {
          assert.equal(options.keepAudioSessionActive, true);
          assert.equal(options.downloadFirst, true);
          return player;
        },
        useAudioPlayerStatus: () => status,
        setAudioModeAsync: async (options: AudioMode) => {
          operations.push(['mode', options]);
          await mode();
        },
      },
      react: {
        useRef: (value: unknown) => (slots[cursor++] ??= { current: value }),
        useEffect: (effect: () => void | (() => void), deps: readonly unknown[]) => {
          const index = cursor++;
          const previous = slots[index];
          if (previous && deps.every((dep, i) => Object.is(dep, previous.deps?.[i]))) return;
          previous?.cleanup?.();
          slots[index] = { deps, cleanup: effect() };
        },
      },
      'react-native': { AppState: appState },
      '../../../../assets/sounds/message.wav': { default: 1 },
      '../../calls/store/native-call-store': { useNativeCallStore: { getState: () => store } },
    },
    { __DEV__: false },
  );
  return {
    appState,
    store,
    operations,
    status,
    render: (request: number) => {
      cursor = 0;
      return MessageNotificationSound({ request });
    },
    unmount: () => slots.forEach((slot) => slot.cleanup?.()),
    setMode: (fn: () => Promise<void>) => {
      mode = fn;
    },
    setSeek: (fn: () => Promise<void>) => {
      seek = fn;
    },
  };
}

async function flush() {
  for (let step = 0; step < 8; step++) await Promise.resolve();
}

test('message sound is routed to native instead of Web Audio in the RN shell', () => {
  const messages: unknown[] = [];
  const { playMessageBloop } = load<WebSoundModule>(
    '../../web/src/features/social/read-state/sound/messageBloop.ts',
    {
      '@/shared/audio/audio-context': {
        getSharedAudioContext: () => {
          throw new Error('Web Audio must not run');
        },
      },
      '@/shared/audio/tone': {},
      '@/shared/lib/nativeBridge': {
        isNativeShell: () => true,
        postToNative: (message: unknown) => messages.push(message),
      },
    },
    {},
  );
  playMessageBloop();
  // A plain copy: the message object was created inside the module's VM context.
  assert.deepEqual(JSON.parse(JSON.stringify(messages)), [{ type: 'notifications/message-sound' }]);
});

test('browser keeps the same two-note message sound', () => {
  const notes: { frequency: number; startTime: number }[] = [];
  const node = () => ({ connect() {}, disconnect() {}, gain: {}, delayTime: {} });
  const context = { createGain: node, createDelay: node, currentTime: 3, destination: {} };
  const { playMessageBloop } = load<WebSoundModule>(
    '../../web/src/features/social/read-state/sound/messageBloop.ts',
    {
      '@/shared/audio/audio-context': { getSharedAudioContext: () => context },
      '@/shared/audio/tone': {
        scheduleBell: (
          _context: unknown,
          _destinations: unknown,
          options: { frequency: number; startTime: number },
        ) => notes.push(options),
      },
      '@/shared/lib/nativeBridge': { isNativeShell: () => false, postToNative: () => {} },
    },
    { setTimeout: () => {} },
  );
  playMessageBloop();
  assert.deepEqual(
    notes.map((note) => note.frequency),
    [659.25, 987.77],
  );
  assert.deepEqual(
    notes.map((note) => note.startTime),
    [3, 3.1],
  );
});

test('native player configures mixed audio and replays the loaded message sound', async () => {
  const f = fixture();
  f.render(0);
  assert.equal(f.operations.length, 0);
  f.render(1);
  await flush();
  assert.deepEqual(
    f.operations.map((operation) => operation[0]),
    ['mode', 'seek', 'play'],
  );
  const mode = f.operations[0];
  assert.equal(mode[0], 'mode');
  assert.equal(mode[1].playsInSilentMode, false);
  assert.equal(mode[1].interruptionMode, 'mixWithOthers');
  assert.equal(f.operations[1][1], 0);
  f.render(2);
  await flush();
  assert.equal(f.operations.filter((operation) => operation[0] === 'play').length, 2);
});

test('native sound does not play in background or change an active call audio session', async () => {
  const f = fixture();
  f.appState.currentState = 'background';
  f.render(1);
  await flush();
  f.appState.currentState = 'active';
  f.store.call = { status: 'connected' };
  f.render(2);
  await flush();
  assert.equal(f.operations.length, 0);
});

test('native sound is cancelled if a call starts while audio mode is being configured', async () => {
  const f = fixture();
  let finish!: () => void;
  f.setMode(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  f.render(1);
  f.store.call = { status: 'connecting' };
  finish();
  await flush();
  assert.deepEqual(
    f.operations.map((operation) => operation[0]),
    ['mode'],
  );
});

test('native sound cannot play after unmount or after the app goes to background', async () => {
  for (const cancel of ['unmount', 'background']) {
    const f = fixture();
    let finish!: () => void;
    f.setSeek(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    f.render(1);
    await flush();
    if (cancel === 'unmount') f.unmount();
    else f.appState.currentState = 'background';
    finish();
    await flush();
    assert.equal(
      f.operations.some((operation) => operation[0] === 'play'),
      false,
    );
  }
});

test('an audio configuration failure is caught without starting playback', async () => {
  const f = fixture();
  f.setMode(async () => {
    throw new Error('Audio session unavailable');
  });
  f.render(1);
  await flush();
  assert.deepEqual(
    f.operations.map((operation) => operation[0]),
    ['mode'],
  );
});

test('first notification waits until the downloaded sound is ready', async () => {
  const f = fixture();
  f.status.isLoaded = false;
  f.render(1);
  await flush();
  assert.equal(f.operations.length, 0);
  f.status.isLoaded = true;
  f.render(1);
  await flush();
  assert.deepEqual(
    f.operations.map((operation) => operation[0]),
    ['mode', 'seek', 'play'],
  );
});

test('reloading the player does not replay an already handled notification', async () => {
  const f = fixture();
  f.render(1);
  await flush();
  f.status.isLoaded = false;
  f.render(1);
  f.status.isLoaded = true;
  f.render(1);
  await flush();
  assert.equal(f.operations.filter((operation) => operation[0] === 'play').length, 1);
});
