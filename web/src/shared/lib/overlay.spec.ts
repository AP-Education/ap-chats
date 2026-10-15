import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hiddenOverlay, overlay } from './overlay';

test('a closing overlay keeps its content until the exit animation ends, then lets it go', () => {
  const shown = overlay(hiddenOverlay<string>(), { type: 'show', item: 'design' });
  const closing = overlay(shown, { type: 'close' });
  const closed = overlay(closing, { type: 'closed' });

  assert.equal(closing.open, false);
  assert.equal(closing.item, 'design');
  assert.equal(closed.item, null);
});

test('showing the same item again starts it afresh, and a late exit does not hide it', () => {
  const shown = overlay(hiddenOverlay<string>(), { type: 'show', item: 'design' });
  const closing = overlay(shown, { type: 'close' });
  const reshown = overlay(closing, { type: 'show', item: 'design' });
  const lateExit = overlay(reshown, { type: 'closed' });

  assert.notEqual(reshown.showing, shown.showing);
  assert.equal(lateExit.item, 'design');
  assert.equal(lateExit.open, true);
});
