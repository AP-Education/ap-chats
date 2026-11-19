import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

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

test('stops a hung grandchild that holds the output open', async (t) => {
  // The child exits at once; the process it started keeps stdout open, as Metro under expo
  // under pnpm would. Its pid goes to a file, since run() keeps no output on a timeout.
  const pidFile = path.join(mkdtempSync(path.join(tmpdir(), 'run-spec-')), 'pid');
  const script = [
    "const { spawn } = require('node:child_process');",
    "const { writeFileSync } = require('node:fs');",
    "const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60_000)'], { stdio: 'inherit' });",
    `writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));`,
    // Unreferenced, so this process really exits and only the grandchild holds stdout.
    'child.unref();',
  ].join('\n');
  // Should the assertions fail, the fixture is not left running.
  t.after(() => {
    if (existsSync(pidFile)) signal(Number(readFileSync(pidFile, 'utf8')), 'SIGKILL');
  });

  const started = Date.now();
  await assert.rejects(
    run(process.execPath, ['-e', script], { timeoutMs: 300 }),
    /took longer than/u,
  );
  const grandchild = Number(readFileSync(pidFile, 'utf8'));
  assert.ok(Date.now() - started < 5_000);
  // Killed by then; the pid may linger a moment until the system reaps the orphan.
  const deadline = Date.now() + 2_000;
  while (signal(grandchild, 0) && Date.now() < deadline) await delay(50);
  assert.equal(signal(grandchild, 0), false);
});

/** Whether the signal reached a live process. */
function signal(pid: number, name: NodeJS.Signals | 0): boolean {
  try {
    process.kill(pid, name);
    return true;
  } catch {
    return false;
  }
}
