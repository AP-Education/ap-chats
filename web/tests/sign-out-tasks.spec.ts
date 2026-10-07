import assert from 'node:assert/strict';
import { test } from 'node:test';

import { onSignOut, runSignOutTasks } from '../src/features/auth/stores/sign-out-tasks';

test('sign-out waits for every registered task, and a failing one does not block the rest', async () => {
  const done: string[] = [];
  const stopFailing = onSignOut(async () => {
    throw new Error('offline');
  });
  const stopRelease = onSignOut(async () => {
    done.push('release push');
  });

  await runSignOutTasks();
  assert.deepEqual(done, ['release push']);

  stopFailing();
  stopRelease();
  await runSignOutTasks();
  assert.deepEqual(done, ['release push']);
});
