import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

type Operation = ['create', unknown, unknown] | ['seek', number] | ['play'] | ['remove'];
type CallSoundModule = { playCallSound: (source: unknown) => void };

function fixture() {
  const operations: Operation[] = [];
  const createAudioPlayer = (source: unknown, options: unknown) => {
    // Copied into this realm: the module runs in its own vm context.
    operations.push(['create', source, { ...(options as object) }]);
    return {
      async seekTo(time: number) {
        operations.push(['seek', time]);
      },
      play() {
        operations.push(['play']);
      },
      remove() {
        operations.push(['remove']);
      },
    };
  };

  const exports = {};
  const source = ts.transpileModule(
    readFileSync(resolve(__dirname, '../src/features/calls/utils/call-sound.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  runInNewContext(source, {
    exports,
    __DEV__: false,
    require: (name: string) => {
      assert.equal(name, 'expo-audio');
      return { createAudioPlayer };
    },
  });
  return { operations, module: exports as CallSoundModule };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('reuses one player per sound and never releases it', async () => {
  const { operations, module } = fixture();

  module.playCallSound(1);
  await settle();
  module.playCallSound(1);
  await settle();

  assert.deepEqual(operations, [
    ['create', 1, { keepAudioSessionActive: true }],
    ['seek', 0],
    ['play'],
    ['seek', 0],
    ['play'],
  ]);
});

test('keeps a separate player for each sound', async () => {
  const { operations, module } = fixture();

  module.playCallSound(1);
  module.playCallSound(2);
  await settle();

  const created = operations.filter(([kind]) => kind === 'create').map(([, source]) => source);
  assert.deepEqual(created, [1, 2]);
  assert.ok(!operations.some(([kind]) => kind === 'remove'));
});
