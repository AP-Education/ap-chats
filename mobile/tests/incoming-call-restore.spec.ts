import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import { useNativeCallStore } from '../src/features/calls/store/native-call-store';
import { hydrateCallSession } from '../src/features/calls/utils/hydrate-call-session';
import { getTrackedSession, untrackSession } from '../src/features/calls/utils/session-registry';

const session = {
  id: 'cold-start-session',
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

test('cold start restores an incoming call without relying on CallSessionAdded replay', async () => {
  await hydrateCallSession({ getActiveCallSession: async () => session } as never);
  const tracked = getTrackedSession(session.id);
  assert.equal(tracked?.serverCallId, 'server-call');
  assert.equal(tracked?.metadata.workspaceId, 'workspace');
  assert.equal(useNativeCallStore.getState().call?.status, 'ringing');
  useNativeCallStore.getState().updateCall({ status: 'connecting' });
  await hydrateCallSession({ getActiveCallSession: async () => session } as never);
  assert.equal(getTrackedSession(session.id), tracked);
  assert.equal(useNativeCallStore.getState().call?.status, 'connecting');
  untrackSession(session.id);
  useNativeCallStore.getState().clearCall();
});

test('invalid native metadata cannot create a tracked incoming session', async () => {
  await hydrateCallSession({
    getActiveCallSession: async () => ({
      ...session,
      incomingCallEvent: { ...session.incomingCallEvent, metadata: { workspaceId: null } },
    }),
  } as never);
  assert.equal(getTrackedSession(session.id), undefined);
});

test('native calls wait for restored auth and refresh an expired background token', async () => {
  let restore!: () => void;
  let refreshed = false;
  const state = {
    status: 'signed-in',
    tokens: { accessToken: 'expired', expiresAt: 0 },
    refreshNow: async () => {
      refreshed = true;
      state.tokens = { accessToken: 'renewed', expiresAt: Date.now() + 60000 };
    },
  };
  const auth = {
    authRestored: new Promise<void>((resolve) => {
      restore = resolve;
    }),
    useAuthStore: { getState: () => state },
  };
  const exports: { requireAccessToken?: () => Promise<string> } = {};
  const source = ts.transpileModule(
    readFileSync(
      new URL('../src/features/calls/utils/require-access-token.ts', import.meta.url),
      'utf8',
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  runInNewContext(source, { exports, require: () => auth, Date });
  const token = exports.requireAccessToken!();
  assert.equal(refreshed, false);
  restore();
  assert.equal(await token, 'renewed');
  assert.equal(refreshed, true);
});
