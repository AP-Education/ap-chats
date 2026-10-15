import assert from 'node:assert/strict';
import { test } from 'node:test';

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
