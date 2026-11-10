import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';

import { BrowserVoiceRecorder } from './browser-recorder';
import { claimAudioPlayback, releaseAudioPlayback } from './playback';
import { MAX_VOICE_BYTES, type VoiceState } from './types';

function fixture(t: TestContext) {
  let cleanup = () => {};
  const descriptors = new Map(
    ['navigator', 'document', 'window', 'MediaRecorder'].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  t.after(() => {
    cleanup();
    for (const [key, value] of descriptors) {
      if (value) Object.defineProperty(globalThis, key, value);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  let now = 0;
  t.mock.method(performance, 'now', () => now);
  const track = Object.assign(new EventTarget(), {
    stops: 0,
    stop() {
      this.stops++;
    },
  });
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const document = Object.assign(new EventTarget(), {
    visibilityState: 'visible',
    hasFocus: () => true,
  });
  const window = new EventTarget();
  let getMedia = async () => stream;
  const instances: FakeRecorder[] = [];
  class FakeRecorder {
    static isTypeSupported = (type: string) => type === 'audio/mp4';
    state = 'inactive';
    mimeType = 'audio/mp4';
    ondataavailable?: (event: { data: Blob }) => void;
    onstop?: () => void;
    onerror?: () => void;
    constructor() {
      instances.push(this);
    }
    start() {
      this.state = 'recording';
    }
    pause() {
      this.state = 'paused';
    }
    resume() {
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      setTimeout(() => {
        this.ondataavailable?.({ data: new Blob(['encoded audio'], { type: this.mimeType }) });
        this.onstop?.();
      }, 0);
    }
  }
  for (const [key, value] of Object.entries({
    navigator: { mediaDevices: { getUserMedia: () => getMedia() } },
    document,
    window,
    MediaRecorder: FakeRecorder,
  }))
    Object.defineProperty(globalThis, key, { configurable: true, value });
  const states: VoiceState[] = [];
  const recorder = new BrowserVoiceRecorder((state) => states.push(state));
  cleanup = () => recorder.dispose();
  return {
    recorder,
    states,
    track,
    document,
    advance(ms: number) {
      now += ms;
      t.mock.timers.tick(ms);
    },
    get instance() {
      return instances.at(-1)!;
    },
    media(value: typeof getMedia) {
      getMedia = value;
    },
  };
}

test('browser recording retains the final encoded chunk before releasing its microphone', async (t) => {
  const f = fixture(t);
  await f.recorder.start();
  f.advance(1000);
  const stopped = f.recorder.stop();
  assert.equal(f.track.stops, 0);
  f.advance(0);
  await stopped;
  assert.equal(f.track.stops, 1);
  assert.equal(f.states.at(-1)!.phase, 'ready');
  assert.equal(f.recorder.take()!.voice, true);
});

test('cancel while browser permission is pending immediately stops a late granted stream', async (t) => {
  const f = fixture(t);
  let grant!: (value: Awaited<ReturnType<Parameters<typeof f.media>[0]>>) => void;
  f.media(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  );
  const started = f.recorder.start();
  f.recorder.dispose();
  grant({ getTracks: () => [f.track], getAudioTracks: () => [f.track] });
  await started;
  assert.equal(f.track.stops, 1);
  assert.equal(
    f.states.some((state) => state.phase === 'recording'),
    false,
  );
});

test('browser permission rejection never opens a recording or creates a file', async (t) => {
  const f = fixture(t);
  f.media(async () => {
    throw new DOMException('Denied', 'NotAllowedError');
  });
  await f.recorder.start();
  assert.equal(f.states.at(-1)!.phase, 'error');
  assert.match(f.states.at(-1)!.error!, /дозволу/);
  assert.equal(f.recorder.take(), undefined);
});

test('browser time limit finishes a recording without sending it', async (t) => {
  const f = fixture(t);
  await f.recorder.start();
  f.advance(600_000);
  f.advance(0);
  assert.equal(f.states.at(-1)!.phase, 'ready');
  assert.equal(f.track.stops, 1);
  assert.equal(f.states.at(-1)!.durationMs, 600_000);
});

test('an oversized encoded chunk is discarded and releases the microphone', async (t) => {
  const f = fixture(t);
  await f.recorder.start();
  f.advance(1000);
  f.instance.ondataavailable?.({ data: { size: MAX_VOICE_BYTES + 1 } as Blob });
  f.advance(0);
  assert.equal(f.states.at(-1)!.phase, 'error');
  assert.equal(f.recorder.take(), undefined);
  assert.equal(f.track.stops, 1);
});

test('starting another audio player pauses the previous one and release cannot clear a new owner', () => {
  let firstPaused = 0,
    secondPaused = 0;
  const first = {
    pause() {
      firstPaused++;
    },
  } as unknown as HTMLMediaElement;
  const second = {
    pause() {
      secondPaused++;
    },
  } as unknown as HTMLMediaElement;
  claimAudioPlayback(first);
  claimAudioPlayback(second);
  releaseAudioPlayback(first);
  claimAudioPlayback(first);
  assert.equal(firstPaused, 1);
  assert.equal(secondPaused, 1);
  releaseAudioPlayback(first);
});

test('an incoming call during a browser permission prompt cancels late microphone acquisition', async (t) => {
  const f = fixture(t);
  let grant!: (value: Awaited<ReturnType<Parameters<typeof f.media>[0]>>) => void;
  f.media(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  );
  const started = f.recorder.start();
  f.recorder.interrupt();
  grant({ getTracks: () => [f.track], getAudioTracks: () => [f.track] });
  await started;
  assert.equal(f.states.at(-1)!.phase, 'error');
  assert.equal(f.track.stops, 1);
  assert.equal(f.recorder.take(), undefined);
});

test('an incoming browser call stops the recording for review and retains its voice draft', async (t) => {
  const f = fixture(t);
  await f.recorder.start();
  f.advance(1500);
  f.recorder.interrupt();
  f.advance(0);
  assert.equal(f.states.at(-1)!.phase, 'ready');
  assert.equal(f.track.stops, 1);
  assert.equal(f.recorder.take()!.voice, true);
});
