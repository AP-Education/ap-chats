import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createGestureFixture } from './fixtures/touch-gesture-runtime.mjs';

function replyFixture(extra = {}) {
  const runtime = createGestureFixture();
  let replies = 0;
  let longPresses = 0;
  const options = {
    messageId: 'message',
    enabled: true,
    canReply: true,
    onReply: () => {
      replies++;
    },
    onLongPress: () => {
      longPresses++;
    },
    ...extra,
  };
  const row = runtime.mount(runtime.useMessageReplySwipe, options);
  return {
    ...runtime,
    row,
    options,
    start(event = runtime.touch()) {
      runtime.beginTouch(
        event,
        runtime.nav.value.openGesture.onTouchStartCapture,
        row.value.gesture.onTouchStartCapture,
      );
    },
    move(x, y = 50) {
      runtime.emit('touchmove', x, y);
      runtime.advance(16);
      return row.render();
    },
    release(x, y = 50) {
      runtime.emit('touchend', x, y);
      return row.render();
    },
    replies: () => replies,
    longPresses: () => longPresses,
  };
}

test('reply starts on the next frame and follows the finger one to one', () => {
  const f = replyFixture();
  f.start();
  const result = f.move(138, 53);
  assert.equal(result.offset, 12);
  assert.equal(result.dragging, true);
  assert.equal(result.progress, 12 / 48);
  assert.equal(f.replies(), 0);
  f.release(138, 53);
  assert.equal(f.replies(), 0);
  assert.equal(f.row.value.offset, 0);
});

test('visual readiness and distance commit share the same threshold', () => {
  const f = replyFixture();
  f.start();
  f.advance(150);
  let result = f.move(103);
  assert.equal(result.ready, false);
  assert.equal(result.offset, 47);
  result = f.move(102);
  assert.equal(result.ready, true);
  assert.equal(result.progress, 1);
  assert.equal(result.offset, 48);
  f.release(102);
  assert.equal(f.replies(), 1);
  assert.equal(f.row.value.offset, 0);
  assert.equal(f.row.value.dragging, false);
});

test('over-pulling adds smooth bounded resistance after the threshold', () => {
  const f = replyFixture();
  f.start();
  const near = f.move(101).offset;
  const far = f.move(-100).offset;
  assert.ok(near > 48 && near < 49);
  assert.ok(far > near && far <= 64);
  f.release(-100);
  assert.equal(f.replies(), 1);
});

test('short flick replies without requiring a long exact swipe', () => {
  const f = replyFixture();
  f.start();
  f.advance(30);
  f.move(122, 56);
  f.release(122, 56);
  assert.equal(f.replies(), 1);
  assert.equal(f.isOpen(), false);
});

test('pulling back before release cancels the reply and clears its hint', () => {
  const f = replyFixture();
  f.start();
  f.move(90);
  assert.equal(f.row.value.ready, true);
  f.move(146);
  assert.equal(f.row.value.ready, false);
  f.release(146);
  assert.equal(f.replies(), 0);
  assert.equal(f.row.value.offset, 0);
  assert.equal(f.row.value.progress, 0);
});

for (const event of ['touchcancel', 'blur', 'pagehide', 'resize']) {
  test(`${event} returns the message to rest and allows the next reply`, () => {
    const f = replyFixture();
    f.start();
    f.move(90);
    f.emit(event);
    assert.equal(f.row.render().offset, 0);
    assert.equal(f.replies(), 0);
    f.start();
    f.advance(150);
    f.release(90);
    assert.equal(f.replies(), 1);
  });
}

test('vertical scroll keeps reply and navigation inactive', () => {
  const f = replyFixture();
  f.start();
  f.move(147, 90);
  f.release(90, 90);
  assert.equal(f.replies(), 0);
  assert.equal(f.row.value.offset, 0);
  assert.equal(f.isOpen(), false);
});

test('right swipe opens navigation without dragging the reply or firing long press', () => {
  const f = replyFixture();
  f.start();
  f.move(210);
  assert.equal(f.row.value.offset, 0);
  f.release(210);
  f.advance(600);
  assert.equal(f.isOpen(), true);
  assert.equal(f.replies(), 0);
  assert.equal(f.longPresses(), 0);
});

test('long press remains available and does not turn into a reply', () => {
  const f = replyFixture();
  f.start();
  f.advance(500);
  assert.equal(f.longPresses(), 1);
  f.release(90);
  assert.equal(f.replies(), 0);
});

test('links retain their long press while still allowing a deliberate swipe', () => {
  const f = replyFixture();
  const link = f.touch(150, 50, {
    target: { closest: (selector) => (selector === 'a, button' ? {} : null) },
  });
  f.start(link);
  f.advance(600);
  assert.equal(f.longPresses(), 0);
  f.move(90);
  f.release(90);
  assert.equal(f.replies(), 1);
});

test('unavailable replies keep long press but never shift or invoke reply', () => {
  const f = replyFixture({ canReply: false });
  f.start();
  f.move(90);
  assert.equal(f.row.value.offset, 0);
  f.release(90);
  assert.equal(f.replies(), 0);
  f.start();
  f.advance(500);
  assert.equal(f.longPresses(), 1);
});

test('editing or pending messages ignore reply and long press', () => {
  const f = replyFixture({ enabled: false });
  f.start();
  f.move(90);
  f.advance(600);
  f.release(90);
  assert.equal(f.row.value.offset, 0);
  assert.equal(f.replies(), 0);
  assert.equal(f.longPresses(), 0);
});

test('disabling actions mid-gesture clears progress and cannot reply on release', () => {
  const f = replyFixture();
  f.start();
  f.move(90);
  f.row.render({ ...f.options, enabled: false });
  assert.equal(f.row.value.offset, 0);
  f.emit('touchend', 90);
  assert.equal(f.replies(), 0);
});

test('unmount cancels scheduled progress and callbacks', () => {
  const f = replyFixture();
  f.start();
  f.emit('touchmove', 90);
  f.row.unmount();
  f.advance(600);
  f.emit('touchend', 90);
  assert.equal(f.replies(), 0);
  assert.equal(f.longPresses(), 0);
});

test('reply claims native scrolling while navigation observes the same touch without claiming it', () => {
  const f = replyFixture();
  f.navigate();
  f.start();
  assert.equal(f.listeners('touchmove').length, 1);
  for (const options of f.listeners('touchmove')) assert.equal(options.passive, false);
  assert.equal(f.emit('touchmove', 138, 53).defaultPrevented, true);
  f.advance(16);
  assert.equal(f.row.render().offset, 12);
  f.emit('pointercancel');
  assert.equal(f.emit('touchmove', 90, 140).defaultPrevented, true);
  f.advance(16);
  assert.ok(f.row.render().offset > 48);
  f.release(90, 140);
  assert.equal(f.replies(), 1);
  assert.equal(f.isOpen(), false);
  assert.equal(f.listeners('touchend').length, 0);
});

test('native scroll takeover cancels reply instead of replying to a scrolling finger', () => {
  const f = replyFixture();
  f.start();
  f.move(138);
  f.emit('touchmove', 90, 110, { cancelable: false });
  assert.equal(f.row.render().offset, 0);
  f.release(90, 110);
  assert.equal(f.replies(), 0);
});

test('unavailable reply leaves native scrolling untouched', () => {
  const f = replyFixture({ canReply: false });
  f.start();
  assert.equal(f.emit('touchmove', 90).defaultPrevented, false);
  f.release(90);
  assert.equal(f.replies(), 0);
});

test('changing messages cancels the old touch and the next reply starts from zero', () => {
  const f = replyFixture();
  f.start();
  f.move(90);
  f.options.messageId = 'next-message';
  f.row.render(f.options);
  assert.equal(f.row.render().offset, 0);
  f.release(90);
  assert.equal(f.replies(), 0);
  f.start();
  f.move(90);
  f.release(90);
  assert.equal(f.replies(), 1);
});
