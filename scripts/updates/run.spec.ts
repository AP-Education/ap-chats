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

test('stops a hung grandchild that holds the output open', async () => {
  // The child exits at once; the process it started keeps stdout open, as Metro under expo
  // under pnpm would.
  const script = [
    "const { spawn } = require('node:child_process');",
    "spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60_000)'], { stdio: 'inherit' });",
  ].join('\n');
  const started = Date.now();
  await assert.rejects(
    run(process.execPath, ['-e', script], { timeoutMs: 300 }),
    /took longer than/u,
  );
  assert.ok(Date.now() - started < 5_000);
});
