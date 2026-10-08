import assert from 'node:assert/strict';
import { test } from 'node:test';

import { onSignOut, runSignOutTasks } from './sign-out-tasks';

test('an offline cleanup task never blocks the others or the sign-out itself', async () => {
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

  assert.deepEqual(done, ['release push'], 'an unregistered task does not run again');
});
