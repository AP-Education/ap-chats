import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { VoiceStateMessage } from '../types';
import { isVoiceRequest } from '../types';
import { type LocalRecording, VoiceSession } from './voice-session';

const scope = { workspaceId: 'workspace', channelId: 'channel' };

function fixture() {
  let time = 0;
  let allowed = true;
  const states: VoiceStateMessage[] = [];
  const files: LocalRecording[] = [];
  const removed: string[] = [];
  const calls = { prepared: 0, started: 0, paused: 0, stopped: 0, disposed: 0 };
  let prepare = async () => {};
  let stop = async () => ({ uri: 'file:///own-cache/voice.m4a', size: 4096 });
  const session = new VoiceSession({
    now: () => time,
    randomId: () => 'recording',
    canRecord: () => allowed,
    emit: (state) => states.push(state),
    retain: (file) => files.push(file),
    remove: (uri) => removed.push(uri),
    createDriver: () => ({
      prepare: async () => {
        calls.prepared++;
        await prepare();
      },
      record: () => {
        calls.started++;
      },
      pause: () => {
        calls.paused++;
      },
      stop: async () => {
        calls.stopped++;
        return stop();
      },
      dispose: () => {
        calls.disposed++;
      },
    }),
  });
  return {
    session,
    states,
    files,
    removed,
    calls,
    advance: (ms: number) => {
      time += ms;
    },
    disallow: () => {
      allowed = false;
    },
    prepareWith: (value: () => Promise<void>) => {
      prepare = value;
    },
    stopWith: (value: typeof stop) => {
      stop = value;
    },
  };
}

test('native recording pauses without counting paused time and keeps its original scope', async () => {
  const f = fixture();
  await f.session.start('session', scope);
  f.advance(1000);
  f.session.pause('session');
  f.advance(5000);
  f.session.resume('session');
  f.advance(750);
  await f.session.stop('session');
  assert.equal(f.files.length, 1);
  assert.equal(f.files[0]!.durationMs, 1750);
  assert.equal(f.files[0]!.channelId, scope.channelId);
  assert.equal(f.states.at(-1)!.phase, 'ready');
  f.session.cancel('session', true);
  assert.deepEqual(f.removed, []);
});

test('cancel while the OS permission prompt is pending never starts the microphone', async () => {
  const f = fixture();
  let grant!: () => void;
  f.prepareWith(
    () =>
      new Promise<void>((resolve) => {
        grant = resolve;
      }),
  );
  const starting = f.session.start('session', scope);
  f.session.cancel('session');
  grant();
  await starting;
  assert.equal(f.calls.started, 0);
  assert.equal(f.files.length, 0);
});

test('permission denial and an active call surface an error and retain no recording', async () => {
  const denied = fixture();
  denied.prepareWith(async () => {
    throw new Error('Microphone denied');
  });
  await denied.session.start('session', scope);
  assert.equal(denied.states.at(-1)!.error, 'Microphone denied');
  denied.session.cancel('session');
  const call = fixture();
  call.disallow();
  await call.session.start('session', scope);
  assert.equal(call.calls.prepared, 0);
  assert.match(call.states.at(-1)!.error!, /дзвінка/);
  call.session.cancel('session');
});

test('duplicate start and stop and stale session commands cannot create two recordings', async () => {
  const f = fixture();
  await f.session.start('session', scope);
  await f.session.start('other', { ...scope, channelId: 'other' });
  f.advance(1000);
  f.session.pause('other');
  await Promise.all([f.session.stop('session'), f.session.stop('session')]);
  assert.equal(f.calls.started, 1);
  assert.equal(f.calls.stopped, 1);
  assert.equal(f.files.length, 1);
  f.session.cancel('session');
  assert.equal(f.removed.length, 1);
});

test('cancel during stop deletes the late file instead of reviving the closed composer', async () => {
  const f = fixture();
  let complete!: (value: { uri: string; size: number }) => void;
  f.stopWith(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  await f.session.start('session', scope);
  f.advance(1000);
  const stopped = f.session.stop('session');
  f.session.cancel('session');
  complete({ uri: 'file:///own-cache/late.m4a', size: 1000 });
  await stopped;
  assert.equal(f.files.length, 0);
  assert.deepEqual(f.removed, ['file:///own-cache/late.m4a']);
});

test('background or incoming call stops a recording for review without sending it', async () => {
  const f = fixture();
  await f.session.start('session', scope);
  f.advance(1500);
  f.session.interrupt();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.states.at(-1)!.phase, 'ready');
  assert.equal(f.files.length, 1);
  f.session.cancel('session');
});

test('short, missing or oversized native recordings are deleted and cannot be sent', async () => {
  for (const size of [0, 21 * 1024 * 1024]) {
    const f = fixture();
    f.stopWith(async () => ({ uri: 'file:///own-cache/bad.m4a', size }));
    await f.session.start('session', scope);
    f.advance(1000);
    await f.session.stop('session');
    assert.equal(f.files.length, 0);
    assert.equal(f.states.at(-1)!.phase, 'error');
    assert.equal(f.removed.length, 1);
    f.session.cancel('session');
  }
});

test('voice bridge accepts only known operations and bounded identifiers', () => {
  assert.equal(isVoiceRequest({ type: 'voice/start', sessionId: 'a', ...scope }), true);
  for (const value of [
    null,
    {},
    { type: 'voice/delete', sessionId: 'a' },
    { type: 'voice/start', sessionId: 'a' },
    { type: 'voice/cancel', sessionId: 'a', keepRecording: 'yes' },
    { type: 'voice/release', recordingId: 'a'.repeat(201) },
  ])
    assert.equal(isVoiceRequest(value), false);
});
