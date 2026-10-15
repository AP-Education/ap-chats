import assert from 'node:assert/strict';
import { test } from 'node:test';

import { useCallRuntimeStore } from './call-runtime-store';

test('the runtime stays with the root that claimed it first, and moves on once it is gone', () => {
  const app = Symbol('app');
  const callWindow = Symbol('call window');
  const { claim, release } = useCallRuntimeStore.getState();
  const owner = () => useCallRuntimeStore.getState().claims[0];

  claim(callWindow);
  claim(app);
  assert.equal(
    owner(),
    callWindow,
    'a call answered from the lock screen starts its own window first',
  );

  release(callWindow);
  assert.equal(owner(), app);

  release(app);
  assert.equal(owner(), undefined);
});
