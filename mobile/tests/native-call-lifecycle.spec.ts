import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, type TestContext } from 'node:test';
import { runInNewContext } from 'node:vm';

import type { CallEndedReason } from 'expo-callkit-telecom';
import ts from 'typescript';

import { useAnswerFailureStore } from '../src/features/calls/store/answer-failure-store';
import { useNativeCallStore } from '../src/features/calls/store/native-call-store';
import type { NativeCallConnectPayload } from '../src/features/calls/types';
import type { answerCall } from '../src/features/calls/utils/answer-call';
import * as outcome from '../src/features/calls/utils/call-outcome';
import type { connectBridgedCall } from '../src/features/calls/utils/connect-bridged-call';
import type { endCallSession } from '../src/features/calls/utils/end-call';
import * as hydration from '../src/features/calls/utils/hydrate-call-session';
import type * as media from '../src/features/calls/utils/livekit-room';
import type { setCallMuted } from '../src/features/calls/utils/mute-call';
import * as outgoing from '../src/features/calls/utils/outgoing-ring';
import type { placeCall } from '../src/features/calls/utils/placed-call';
import * as registry from '../src/features/calls/utils/session-registry';
import type { synchronizeCallSession } from '../src/features/calls/utils/synchronize-call-session';

function load<T>(name: string, dependencies: Record<string, unknown>): T {
  const exports = {};
  const source = ts.transpileModule(
    readFileSync(resolve(__dirname, `../src/features/calls/utils/${name}.ts`), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  runInNewContext(source, {
    exports,
    __DEV__: false,
    AbortController,
    Date,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return exports as T;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

async function flush() {
  for (let step = 0; step < 16; step++) await Promise.resolve();
}

function fixture(t: TestContext) {
  const id = 'native-session';
  const steps: string[] = [];
  const cues: string[] = [];
  const auth = deferred<string>();
  const connection = deferred<void>();
  let connectImmediately = true;
  let connectionError: Error | undefined;
  let audioActive = false;
  let audioListener: (() => void) | undefined;
  let removedAudioListeners = 0;
  let placedOutcomes: { answered: (at: number) => void; over: () => void } | undefined;
  let active: Record<string, unknown> | null = {
    id,
    status: 'connecting',
    isMuted: false,
    incomingCallEvent: {
      serverCallId: 'server-call',
      caller: { id: 'caller', displayName: 'Caller' },
      metadata: {
        workspaceId: 'workspace',
        channelId: 'channel',
        channelKind: 'dm',
        roomName: 'room',
      },
    },
  };
  const payload: NativeCallConnectPayload = {
    workspaceId: 'workspace',
    channelId: 'channel',
    title: 'Caller',
    group: false,
    grant: {
      callId: 'server-call',
      roomName: 'room',
      startedAt: '',
      answeredAt: null,
      url: 'wss://livekit.test',
      token: 'media-token',
      expiresAt: '',
    },
  };
  const room = {
    connect: async () => {
      steps.push('connect');
      if (connectionError) throw connectionError;
      if (!connectImmediately) await connection.promise;
    },
    disconnect: async () => {
      steps.push('disconnect');
      connection.reject(new Error('Disconnected while connecting'));
    },
    localParticipant: {
      setMicrophoneEnabled: async (enabled: boolean) => {
        assert.equal(audioActive, true, 'Microphone must wait for CallKit audio activation');
        steps.push(enabled ? 'mic-on' : 'mic-off');
      },
    },
  };
  // A rejected pending connection is only observed when room.connect is still waiting.
  void connection.promise.catch(() => undefined);
  const CallKit = {
    getActiveCallSession: async () => active,
    getAudioSession: () => ({ isActive: audioActive }),
    addAudioSessionActivatedListener: (listener: () => void) => {
      audioListener = listener;
      return {
        remove: () => {
          removedAudioListeners++;
          audioListener = undefined;
        },
      };
    },
    fulfillIncomingCallConnected: async () => {
      steps.push('fulfill-answer');
      // iOS activates audio only after CXAnswerCallAction.fulfill().
      audioActive = true;
      audioListener?.();
    },
    failIncomingCallConnected: async () => {
      steps.push('fail-answer');
    },
    endCall: async () => {
      steps.push('end-native');
    },
    answerCall: async () => {
      steps.push('answer-native');
    },
    startOutgoingCall: async () => {
      steps.push('start-outgoing');
      // The start event has already happened when the SDK returns its ID.
      active = { id, status: 'connecting', origin: 'outgoingApp' };
      audioActive = true;
      return id;
    },
    addOutgoingCallStartedListener: () => ({ remove() {} }),
    reportOutgoingCallConnected: async () => {
      steps.push('outgoing-connected');
    },
    setMuted: async (_id: string, muted: boolean) => {
      steps.push(muted ? 'callkit-muted' : 'callkit-unmuted');
    },
  };
  const mediaFunctions = load<typeof media>('livekit-room', {
    'livekit-client': {
      Room: class {
        constructor() {
          return room;
        }
      },
    },
  });
  const dependencies = {
    '../store/native-call-store': { useNativeCallStore },
    '../store/answer-failure-store': { useAnswerFailureStore },
    // Each request waits for the session's token first, as authorizedFetch does.
    '../api/calls-api': {
      joinCall: async (
        _workspace: string,
        _channel: string,
        _call: string,
        signal?: AbortSignal,
      ) => {
        await auth.promise;
        if (signal?.aborted) throw new Error('Request aborted');
        steps.push('join');
        return payload.grant;
      },
      leaveCall: async () => {
        await auth.promise;
        steps.push('leave');
      },
      declineCall: async () => {
        await auth.promise;
        steps.push('decline');
      },
    },
    '../../auth': { NotSignedInError: class extends Error {} },
    './session-registry': registry,
    './hydrate-call-session': hydration,
    './livekit-room': mediaFunctions,
    './call-chimes': { playLeaveChime: () => cues.push('leave-chime') },
    './call-tones': { playBusyTone: () => cues.push('busy-tone') },
    './call-cues': {
      trackCallCues: () => {
        cues.push('track-cues');
        return () => cues.push('stop-cues');
      },
    },
    './placed-call': {
      placeCall: (_call: unknown, outcomes: NonNullable<typeof placedOutcomes>) => {
        placedOutcomes = outcomes;
        cues.push('place-call');
        return {
          answer() {},
          resync() {},
          watch: () => cues.push('watch-room'),
          stop: () => cues.push('stop-placed'),
        };
      },
    },
    './audio-route': { syncCurrentAudioRoute() {} },
    './track-remote-participant': { trackRemoteParticipant: () => () => {} },
    './callkit-module': { loadCallKitModule: async () => CallKit },
  };
  const ending = load<{ endCallSession: typeof endCallSession }>('end-call', dependencies);
  const answering = load<{ answerCall: typeof answerCall }>('answer-call', {
    ...dependencies,
    './end-call': ending,
  });
  const bridging = load<{ connectBridgedCall: typeof connectBridgedCall }>('connect-bridged-call', {
    ...dependencies,
    './end-call': ending,
  });
  const muting = load<{ setCallMuted: typeof setCallMuted }>('mute-call', {
    ...dependencies,
    './call-chimes': { playMuteChime() {}, playUnmuteChime() {} },
  });
  t.after(() => {
    registry.untrackSession(id);
    useNativeCallStore.getState().clearCall();
    useAnswerFailureStore.getState().clear();
  });
  return {
    steps,
    cues,
    auth,
    CallKit,
    media: mediaFunctions,
    payload,
    answer: () =>
      answering.answerCall({ id, requestId: 'answer-request' } as never, CallKit as never),
    mute: (isMuted: boolean) => muting.setCallMuted({ id, isMuted } as never, CallKit as never),
    end: (notifyServer = true, reason?: CallEndedReason) =>
      ending.endCallSession({ id }, { notifyServer, reason }),
    bridge: () => bridging.connectBridgedCall(payload),
    hearAnswer: (at: number) => placedOutcomes?.answered(at),
    setActive: (value: typeof active) => {
      active = value;
    },
    pauseConnection: () => {
      connectImmediately = false;
    },
    failConnection: () => {
      connectionError = new Error('Media connection failed');
    },
    removedAudioListeners: () => removedAudioListeners,
  };
}

const leaves = (steps: string[]) => steps.filter((step) => step === 'leave').length;

const ANSWERED_AT = '2026-10-14T10:00:05.000Z';

// iOS activates call audio only after CXAnswerCallAction.fulfill(); enabling the mic first deadlocks.
test('cold answer waits for auth, fulfills CallKit before audio, and connects once on replay', async (t) => {
  const f = fixture(t);
  const answers = Promise.all([f.answer(), f.answer()]);
  await flush();
  assert.deepEqual(f.steps, [], 'nothing happens before auth is restored');

  f.auth.resolve('restored-token');
  await answers;

  assert.deepEqual(f.steps, ['join', 'connect', 'fulfill-answer', 'mic-on']);
  assert.equal(useNativeCallStore.getState().call?.status, 'connected');
});

test('muting while an answer is still connecting keeps the microphone off once audio starts', async (t) => {
  const f = fixture(t);
  const answer = f.answer();
  await flush();

  await f.mute(true);
  assert.equal(useNativeCallStore.getState().call?.isMuted, true);
  assert.deepEqual(
    f.steps,
    ['callkit-muted'],
    'the mic must not be touched before audio activation',
  );

  f.auth.resolve('restored-token');
  await answer;
  assert.deepEqual(f.steps, ['callkit-muted', 'join', 'connect', 'fulfill-answer', 'mic-off']);
});

test('ending during auth restore prevents a late join or phantom UI', async (t) => {
  const f = fixture(t);
  const answer = f.answer();
  await flush();

  await f.end(false);
  f.auth.resolve('restored-token');
  await answer;

  assert.deepEqual(f.steps, []);
  assert.equal(useNativeCallStore.getState().call, null);
});

test('ending during media connection disconnects and leaves once, without answering', async (t) => {
  const f = fixture(t);
  f.pauseConnection();
  f.auth.resolve('token');
  const answer = f.answer();
  await flush();

  await f.end();
  await answer;

  assert.ok(f.steps.includes('disconnect'));
  assert.equal(leaves(f.steps), 1);
  assert.ok(!f.steps.includes('fulfill-answer') && !f.steps.includes('decline'));
  assert.equal(registry.getTrackedSession('native-session'), undefined);
});

test('a failed media connection fails the native answer and leaves the server call once', async (t) => {
  const f = fixture(t);
  f.failConnection();
  f.auth.resolve('token');

  await f.answer();

  assert.equal(leaves(f.steps), 1);
  assert.ok(f.steps.includes('fail-answer') && f.steps.includes('end-native'));
  assert.equal(useNativeCallStore.getState().call, null);
  assert.equal(useAnswerFailureStore.getState().failure, 'unreachable', 'the call window says why');
});

test('a remote native ending releases media without echoing decline or leave', async (t) => {
  const f = fixture(t);
  f.auth.resolve('token');
  await f.answer();

  await f.end(false);

  assert.deepEqual(f.steps.slice(-1), ['disconnect']);
  assert.ok(!f.steps.includes('leave') && !f.steps.includes('decline'));
});

test('a turned-down call ends on the busy tone, any other ending on the leave chime', async (t) => {
  const declined = fixture(t);
  declined.auth.resolve('token');
  await declined.answer();
  await declined.end(false, 'declinedElsewhere');

  const hungUp = fixture(t);
  hungUp.auth.resolve('token');
  await hungUp.answer();
  await hungUp.end(false, 'remoteEnded');

  assert.deepEqual(declined.cues, ['track-cues', 'stop-cues', 'busy-tone']);
  assert.deepEqual(hungUp.cues, ['track-cues', 'stop-cues', 'leave-chime']);
});

test('an outgoing call follows its ring from the start, and its room cues once media is up', async (t) => {
  const f = fixture(t);
  f.setActive(null);
  f.auth.resolve('token');

  await f.bridge();
  await f.end();

  assert.deepEqual(f.cues, [
    'place-call',
    'track-cues',
    'watch-room',
    'stop-cues',
    'stop-placed',
    'leave-chime',
  ]);
});

// CallKit/Telecom play the dialtone until the call is reported connected, so that is the answer.
test('an outgoing call reports connected only once answered, timed by the server', async (t) => {
  const f = fixture(t);
  f.setActive(null);
  f.auth.resolve('token');

  await f.bridge();
  assert.ok(!f.steps.includes('outgoing-connected'), 'still ringing out');
  assert.equal(useNativeCallStore.getState().call?.status, 'connected');
  assert.equal(useNativeCallStore.getState().call?.answeredAt, undefined);

  f.hearAnswer(Date.parse(ANSWERED_AT));
  await flush();

  assert.equal(f.steps.at(-1), 'outgoing-connected');
  assert.equal(useNativeCallStore.getState().call?.answeredAt, Date.parse(ANSWERED_AT));
  assert.equal(
    registry.findPlacedCall('server-call'),
    undefined,
    'an answered call is followed like any other, so its remote end is still noticed',
  );
});

test('joining a call already answered connects before its media, so it never rings back', async (t) => {
  const f = fixture(t);
  f.setActive(null);
  f.payload.grant.answeredAt = ANSWERED_AT;
  f.auth.resolve('token');

  await f.bridge();

  assert.deepEqual(f.steps, ['start-outgoing', 'outgoing-connected', 'connect', 'mic-on']);
  assert.ok(!f.cues.includes('place-call'), 'an answered call has no ring left to follow');
  assert.equal(useNativeCallStore.getState().call?.answeredAt, Date.parse(ANSWERED_AT));
});

test('a WebView join answers a ringing CallKit session instead of starting an outgoing one', async (t) => {
  const f = fixture(t);
  f.setActive({ ...(await f.CallKit.getActiveCallSession()), status: 'ringing' });
  await hydration.hydrateCallSession(f.CallKit as never);

  await f.bridge();

  assert.deepEqual(f.steps, ['answer-native']);
});

test('a WebView join cannot restart a call CallKit is already answering', async (t) => {
  const f = fixture(t);

  await f.bridge();

  assert.deepEqual(f.steps, []);
});

test('outgoing connection survives an early native start event and duplicate bridge requests', async (t) => {
  const f = fixture(t);
  f.setActive(null);
  f.auth.resolve('token');

  await Promise.all([f.bridge(), f.bridge()]);
  await f.bridge();

  assert.deepEqual(f.steps, ['start-outgoing', 'connect', 'mic-on']);
});

test('waiting for call audio ends cleanly on hang-up and cannot miss an early activation', async (t) => {
  const f = fixture(t);
  const hangUp = new AbortController();
  const waiting = f.media.waitForAudioSessionActive(f.CallKit as never, hangUp.signal);
  hangUp.abort();
  await assert.rejects(waiting, /Call ended before audio activation/);

  // Audio may activate between the first snapshot and the listener subscription.
  let snapshots = 0;
  const activatedMeanwhile = {
    ...f.CallKit,
    getAudioSession: () => ({ isActive: ++snapshots > 1 }),
  };
  await f.media.waitForAudioSessionActive(
    activatedMeanwhile as never,
    new AbortController().signal,
  );

  assert.equal(f.removedAudioListeners(), 2);
});

test('foreground sync keeps a local answer but dismisses a ring answered on another device', async (t) => {
  const f = fixture(t);
  await hydration.hydrateCallSession(f.CallKit as never);
  const ended: string[] = [];
  const { synchronizeCallSession: synchronize } = load<{
    synchronizeCallSession: typeof synchronizeCallSession;
  }>('synchronize-call-session', {
    '../store/native-call-store': { useNativeCallStore },
    '../api/calls-api': { activeCall: async () => ({ id: 'server-call', status: 'active' }) },
    './call-outcome': outcome,
    './session-registry': registry,
  });
  const CallKit = {
    reportCallEnded: async (id: string) => {
      ended.push(id);
    },
  };

  await synchronize(CallKit as never);
  assert.deepEqual(ended, [], 'this device is the one answering');

  useNativeCallStore.getState().updateCall({ status: 'ringing' });
  await synchronize(CallKit as never);
  assert.deepEqual(ended, ['native-session']);
});

type Live = { id: string; status: string; answeredAt: string | null } | null;

function placedCallFixture(live: Live) {
  const heard: string[] = [];
  const state = { live, someoneJoins: () => {} };
  const { placeCall: place } = load<{ placeCall: typeof placeCall }>('placed-call', {
    '../api/calls-api': { activeCall: async () => state.live },
    './outgoing-ring': outgoing,
    './room-presence': {
      watchRoomPresence: (_room: unknown, { joined }: { joined: () => void }) => {
        state.someoneJoins = joined;
        return () => {};
      },
    },
  });
  const placed = place(
    {
      metadata: { workspaceId: 'workspace', channelId: 'channel' },
      callId: 'server-call',
      startedAt: new Date(Date.now()).toISOString(),
    },
    {
      answered: (at) => heard.push(`answered at ${at}`),
      over: () => heard.push('over'),
    },
  );
  placed.watch({} as never);
  return { heard, state, placed };
}

const answered = `answered at ${Date.parse(ANSWERED_AT)}`;

test('an answer heard over the socket connects the call at once, at its time, and only once', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const f = placedCallFixture({ id: 'server-call', status: 'ringing', answeredAt: null });

  f.placed.answer(Date.parse(ANSWERED_AT));
  f.state.live = { id: 'server-call', status: 'active', answeredAt: ANSWERED_AT };
  f.state.someoneJoins();
  f.placed.resync();
  await flush();

  assert.deepEqual(f.heard, [answered]);
});

test('an answer heard without its time takes the time from the server', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const f = placedCallFixture({ id: 'server-call', status: 'active', answeredAt: ANSWERED_AT });

  f.placed.answer(undefined);
  await flush();

  assert.deepEqual(f.heard, [answered]);
});

test('someone joining counts as the answer only once the server agrees', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const f = placedCallFixture({ id: 'server-call', status: 'ringing', answeredAt: null });

  f.state.someoneJoins();
  await flush();
  assert.deepEqual(f.heard, [], "the caller's own other device answers nothing");

  f.state.live = { id: 'server-call', status: 'active', answeredAt: ANSWERED_AT };
  f.state.someoneJoins();
  await flush();
  assert.deepEqual(f.heard, [answered]);
});

test('an answer missed while the socket was away is picked up on resync', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const f = placedCallFixture({ id: 'server-call', status: 'active', answeredAt: ANSWERED_AT });

  f.placed.resync();
  await flush();

  assert.deepEqual(f.heard, [answered]);
});

test('a ring the server let go past its deadline ends here, and a stopped call hears nothing', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const missed = placedCallFixture({ id: 'server-call', status: 'ringing', answeredAt: null });
  const hungUp = placedCallFixture({ id: 'server-call', status: 'ringing', answeredAt: null });
  hungUp.placed.stop();

  missed.state.live = null;
  hungUp.state.live = null;
  t.mock.timers.tick(47_000);
  await flush();

  assert.deepEqual(missed.heard, ['over']);
  assert.deepEqual(hungUp.heard, []);
});
