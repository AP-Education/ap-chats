import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

function load(path, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(source, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return exports;
}

function fixture() {
  const appState = { currentState: 'active' };
  const store = { call: null };
  const operations = [];
  const slots = [];
  let cursor = 0;
  const status = { isLoaded: true, error: null };
  let mode = async () => {};
  let seek = async () => {};
  const player = {
    async seekTo(time) {
      operations.push(['seek', time]);
      await seek();
    },
    play() {
      operations.push(['play']);
    },
  };
  const { MessageNotificationSound } = load(
    '../../mobile/src/features/push/components/MessageNotificationSound.tsx',
    {
      'expo-audio': {
        useAudioPlayer: (_source, options) => {
          assert.equal(options.keepAudioSessionActive, true);
          assert.equal(options.downloadFirst, true);
          return player;
        },
        useAudioPlayerStatus: () => status,
        setAudioModeAsync: async (options) => {
          operations.push(['mode', options]);
          await mode();
        },
      },
      react: {
        useRef: (value) => (slots[cursor++] ??= { current: value }),
        useEffect: (effect, deps) => {
          const index = cursor++;
          const previous = slots[index];
          if (previous && deps.every((dep, i) => Object.is(dep, previous.deps[i]))) return;
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
    render: (request) => {
      cursor = 0;
      return MessageNotificationSound({ request });
    },
    unmount: () => slots.forEach((slot) => slot.cleanup?.()),
    setMode: (fn) => {
      mode = fn;
    },
    setSeek: (fn) => {
      seek = fn;
    },
  };
}

async function flush() {
  for (let step = 0; step < 8; step++) await Promise.resolve();
}

test('message sound is routed to native instead of Web Audio in the RN shell', () => {
  const messages = [];
  const { playMessageBloop } = load(
    '../src/features/social/read-state/sound/messageBloop.ts',
    {
      '@/shared/audio/audio-context': {
        getSharedAudioContext: () => {
          throw new Error('Web Audio must not run');
        },
      },
      '@/shared/audio/tone': {},
    },
    {
      window: { ReactNativeWebView: { postMessage: (value) => messages.push(JSON.parse(value)) } },
    },
  );
  playMessageBloop();
  assert.deepEqual(messages, [{ type: 'notifications/message-sound' }]);
});

test('browser keeps the same two-note message sound', () => {
  const notes = [];
  const node = () => ({ connect() {}, disconnect() {}, gain: {}, delayTime: {} });
  const context = { createGain: node, createDelay: node, currentTime: 3, destination: {} };
  const { playMessageBloop } = load(
    '../src/features/social/read-state/sound/messageBloop.ts',
    {
      '@/shared/audio/audio-context': { getSharedAudioContext: () => context },
      '@/shared/audio/tone': {
        scheduleBell: (_context, _destinations, options) => notes.push(options),
      },
    },
    { window: {}, setTimeout: () => {} },
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
  assert.equal(f.operations[0][1].playsInSilentMode, false);
  assert.equal(f.operations[0][1].interruptionMode, 'mixWithOthers');
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
  let finish;
  f.setMode(
    () =>
      new Promise((resolve) => {
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
    let finish;
    f.setSeek(
      () =>
        new Promise((resolve) => {
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
