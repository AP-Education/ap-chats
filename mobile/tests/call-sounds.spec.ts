import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

type Operation = ['create', unknown] | ['seek', unknown] | ['play', unknown] | ['remove', unknown];
type CallState = { call: object | null };
type CallSoundsModule = { playCallSound: (source: unknown) => void };

function fixture({ inCall }: { inCall: boolean }) {
  const operations: Operation[] = [];
  const finishers = new Map<unknown, () => void>();
  let state: CallState = { call: inCall ? {} : null };
  const subscribers: ((next: CallState, previous: CallState) => void)[] = [];

  const store = {
    useNativeCallStore: {
      getState: () => state,
      subscribe: (listener: (next: CallState, previous: CallState) => void) => {
        subscribers.push(listener);
      },
    },
  };

  const createAudioPlayer = (source: unknown, options: { keepAudioSessionActive?: boolean }) => {
    assert.equal(options.keepAudioSessionActive, true);
    operations.push(['create', source]);
    return {
      async seekTo() {
        operations.push(['seek', source]);
      },
      play() {
        operations.push(['play', source]);
      },
      remove() {
        operations.push(['remove', source]);
      },
      addListener(_event: string, listener: (status: { didJustFinish: boolean }) => void) {
        finishers.set(source, () => listener({ didJustFinish: true }));
      },
    };
  };

  const exports = {};
  const source = ts.transpileModule(
    readFileSync(resolve(__dirname, '../src/features/calls/background/call-sounds.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  runInNewContext(source, {
    exports,
    __DEV__: false,
    require: (name: string) => {
      if (name === 'expo-audio') return { createAudioPlayer };
      if (name === '../store/native-call-store') return store;
      assert.fail(`Unexpected import: ${name}`);
    },
  });

  return {
    operations,
    module: exports as CallSoundsModule,
    finish: (sound: unknown) => finishers.get(sound)?.(),
    endCall: () => {
      const previous = state;
      state = { call: null };
      for (const listener of subscribers) listener(state, previous);
    },
  };
}

const settle = () => new Promise((done) => setImmediate(done));
const removed = (operations: Operation[]) =>
  operations.filter(([kind]) => kind === 'remove').map(([, sound]) => sound);

test('keeps one player per sound for the whole call, even after it finishes', async () => {
  const { operations, module, finish } = fixture({ inCall: true });

  module.playCallSound('join');
  await settle();
  finish('join');
  module.playCallSound('join');
  await settle();
  finish('join');

  assert.deepEqual(operations, [
    ['create', 'join'],
    ['seek', 'join'],
    ['play', 'join'],
    ['seek', 'join'],
    ['play', 'join'],
  ]);
});

test('releases the players once the call is over and the ending sound has finished', async () => {
  const { operations, module, finish, endCall } = fixture({ inCall: true });

  module.playCallSound('join');
  await settle();
  finish('join');
  endCall();
  assert.deepEqual(removed(operations), ['join']);

  module.playCallSound('leave');
  await settle();
  assert.deepEqual(removed(operations), ['join']);
  finish('leave');
  assert.deepEqual(removed(operations), ['join', 'leave']);
});

test('waits for a sound still playing when the call ends', async () => {
  const { operations, module, finish, endCall } = fixture({ inCall: true });

  module.playCallSound('mute');
  await settle();
  endCall();
  assert.deepEqual(removed(operations), []);

  finish('mute');
  assert.deepEqual(removed(operations), ['mute']);
});
