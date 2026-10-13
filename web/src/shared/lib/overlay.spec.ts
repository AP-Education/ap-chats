import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hiddenOverlay, overlay } from './overlay';

test('a closed overlay keeps its content for the exit animation, and showing it again starts afresh', () => {
  const shown = overlay(hiddenOverlay<string>(), { type: 'show', item: 'design' });
  const closed = overlay(shown, { type: 'close' });
  const reshown = overlay(closed, { type: 'show', item: 'design' });

  assert.equal(closed.open, false);
  assert.equal(closed.item, 'design');
  assert.equal(reshown.open, true);
  assert.notEqual(reshown.showing, shown.showing);
});
