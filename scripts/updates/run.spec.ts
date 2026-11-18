import assert from 'node:assert/strict';
import { test } from 'node:test';

import { childEnv, lastJson, run } from './run';

test('reads JSON printed after notes', () => {
  assert.deepEqual(lastJson('{"runtimeVersion":"abc"}'), { runtimeVersion: 'abc' });
  assert.deepEqual(lastJson('Fetching builds…\n[{"id":"b1"}]\n'), [{ id: 'b1' }]);
});

test('keeps the update secrets away from the tools it runs', () => {
  const env = childEnv(
    { PATH: '/bin', UPDATES_ADMIN_TOKEN: 'a', UPDATES_SPACES_KEY: 'k', UPDATES_SPACES_SECRET: 's' },
    { APP_UPDATES_CHANNEL: 'preview' },
  );
  assert.deepEqual(env, { PATH: '/bin', APP_UPDATES_CHANNEL: 'preview' });
});

test('stops a command that hangs', async () => {
  await assert.rejects(
    run(process.execPath, ['-e', 'setTimeout(() => {}, 60_000)'], { timeoutMs: 200 }),
    /took longer than/u,
  );
});
