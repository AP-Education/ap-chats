import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

type Operation = ['create', unknown] | ['seek', unknown] | ['play', unknown] | ['remove', unknown];
type CallState = { call: object | null };
type StatusUpdate = { didJustFinish: boolean; error: string | null };
type CallSoundsModule = { playCallSound: (source: unknown) => void };

function fixture({ inCall }: { inCall: boolean }) {
  const operations: Operation[] = [];
  const listeners = new Map<unknown, (status: StatusUpdate) => void>();
  const heldSeeks: (() => void)[] = [];
  let holdSeeks = false;
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
        if (holdSeeks) await new Promise<void>((done) => heldSeeks.push(done));
      },
      play() {
        operations.push(['play', source]);
      },
      remove() {
        operations.push(['remove', source]);
      },
      addListener(_event: string, listener: (status: StatusUpdate) => void) {
        listeners.set(source, listener);
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
    finish: (sound: unknown) => listeners.get(sound)?.({ didJustFinish: true, error: null }),
    fail: (sound: unknown) =>
      listeners.get(sound)?.({ didJustFinish: false, error: 'decoder failed' }),
    holdSeeks: () => {
      holdSeeks = true;
    },
    releaseSeeks: () => {
      holdSeeks = false;
      for (const done of heldSeeks.splice(0)) done();
    },
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

test('a native playback error stops tracking the sound, so the call can still release', async () => {
  const { operations, module, fail, finish, endCall } = fixture({ inCall: true });

  module.playCallSound('unmute');
  await settle();
  fail('unmute');
  endCall();
  assert.deepEqual(removed(operations), ['unmute']);

  module.playCallSound('leave');
  await settle();
  finish('leave');
  assert.deepEqual(removed(operations), ['unmute', 'leave']);
});

test('an earlier completion does not release a player whose replay is still rewinding', async () => {
  const { operations, module, finish, endCall, holdSeeks, releaseSeeks } = fixture({
    inCall: true,
  });

  module.playCallSound('leave');
  await settle();
  endCall();
  holdSeeks();
  module.playCallSound('leave');
  await settle();
  finish('leave');
  assert.deepEqual(removed(operations), []);

  releaseSeeks();
  await settle();
  assert.deepEqual(operations.filter(([kind]) => kind === 'play').length, 2);
  assert.deepEqual(removed(operations), []);

  finish('leave');
  assert.deepEqual(removed(operations), ['leave']);
});
