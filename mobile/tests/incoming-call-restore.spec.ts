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
  status: 'ringing',
  isMuted: false,
  incomingCallEvent: {
    serverCallId: 'server-call',
    caller: { id: 'caller', displayName: 'Caller' },
    metadata: { workspaceId: 'workspace', channelId: 'channel', channelKind: 'dm', roomName: 'r' },
  },
};

function restore(native: object) {
  return hydrateCallSession({ getActiveCallSession: async () => native } as never);
}

function reset() {
  untrackSession(session.id);
  useNativeCallStore.getState().clearCall();
}

// A call that rang or was answered while JS was not running gets no replayed CallSessionAdded.
const coldStarts = [
  ['a ringing call restores as ringing', session, 'ringing'],
  [
    'an answer made before JS started restores as connecting',
    { ...session, status: 'connecting' },
    'connecting',
  ],
  ['an ended call is not restored', { ...session, status: 'ended' }, null],
  [
    'invalid native metadata is not restored',
    { ...session, incomingCallEvent: { ...session.incomingCallEvent, metadata: {} } },
    null,
  ],
] as const;

for (const [name, native, expected] of coldStarts) {
  test(`cold start: ${name}`, async () => {
    await restore(native);

    assert.equal(useNativeCallStore.getState().call?.status ?? null, expected);
    assert.equal(getTrackedSession(session.id)?.serverCallId, expected ? 'server-call' : undefined);
    reset();
  });
}

test('restoring again keeps the session already being answered', async () => {
  await restore(session);
  const tracked = getTrackedSession(session.id);
  useNativeCallStore.getState().updateCall({ status: 'connecting' });

  await restore(session);

  assert.equal(getTrackedSession(session.id), tracked);
  assert.equal(useNativeCallStore.getState().call?.status, 'connecting');
  reset();
});

test('native calls wait for restored auth and refresh an expired background token', async () => {
  let restoreAuth!: () => void;
  const state = {
    status: 'signed-in',
    tokens: { accessToken: 'expired', expiresAt: 0 },
    refreshNow: async () => {
      state.tokens = { accessToken: 'renewed', expiresAt: Date.now() + 60000 };
    },
  };
  const auth = {
    authRestored: new Promise<void>((resolve) => {
      restoreAuth = resolve;
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
  restoreAuth();

  assert.equal(await token, 'renewed');
});
