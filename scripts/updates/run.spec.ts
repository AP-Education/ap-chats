import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lastJson } from './run';

test('reads JSON printed after notes', () => {
  assert.deepEqual(lastJson('{"runtimeVersion":"abc"}'), { runtimeVersion: 'abc' });
  assert.deepEqual(lastJson('Fetching builds…\n[{"id":"b1"}]\n'), [{ id: 'b1' }]);
});
