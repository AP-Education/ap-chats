import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VoiceAudioMode } from './audio-mode';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('a new capture waits for an in-flight audio reset before enabling its microphone', async () => {
  const resetting = deferred();
  const resetStarted = deferred();
  const calls: boolean[] = [];
  let recording = false;
  const mode = new VoiceAudioMode(
    async (enabled) => {
      calls.push(enabled);
      if (!enabled) {
        resetStarted.resolve();
        await resetting.promise;
      }
      recording = enabled;
    },
    () => false,
  );
  const first = mode.acquire();
  await first.enable();
  const release = first.release();
  await resetStarted.promise;
  const second = mode.acquire();
  const prepare = second.enable();
  assert.deepEqual(calls, [true, false]);
  resetting.resolve();
  await Promise.all([release, prepare]);
  assert.deepEqual(calls, [true, false, true]);
  assert.equal(recording, true);
});

test('a reset still in the queue cannot stop the next owner', async () => {
  const calls: boolean[] = [];
  const mode = new VoiceAudioMode(
    async (enabled) => {
      calls.push(enabled);
    },
    () => false,
  );
  const first = mode.acquire();
  await first.enable();
  const release = first.release();
  const second = mode.acquire();
  await Promise.all([release, second.enable()]);
  assert.deepEqual(calls, [true, true]);
});

test('late disposal from a cancelled recorder cannot reset an active replacement', async () => {
  const calls: boolean[] = [];
  const mode = new VoiceAudioMode(
    async (enabled) => {
      calls.push(enabled);
    },
    () => false,
  );
  const old = mode.acquire();
  await old.enable();
  const current = mode.acquire();
  await current.enable();
  await old.release();
  assert.deepEqual(calls, [true, true]);
  await current.release();
  assert.deepEqual(calls, [true, true, false]);
});

test('a call that starts while a change is queued keeps ownership of the audio session', async () => {
  let call = false;
  const calls: boolean[] = [];
  const mode = new VoiceAudioMode(
    async (enabled) => {
      calls.push(enabled);
    },
    () => call,
  );
  const capture = mode.acquire();
  const pending = capture.enable();
  call = true;
  await pending;
  await capture.release();
  assert.deepEqual(calls, []);
  call = false;
  await mode.acquire().enable();
  assert.deepEqual(calls, [true]);
});

test('a rejected audio change does not block the next recording', async () => {
  let fail = true;
  const mode = new VoiceAudioMode(
    async () => {
      if (fail) {
        fail = false;
        throw new Error('Audio interruption');
      }
    },
    () => false,
  );
  await assert.rejects(mode.acquire().enable(), /Audio interruption/);
  await mode.acquire().enable();
});
