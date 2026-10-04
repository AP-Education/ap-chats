import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CSSProperties } from 'react';

import { createGestureFixture as fixture } from './fixtures/touch-gesture-runtime.ts';

function menuProgress(style: CSSProperties | undefined): number {
  assert.ok(style);
  return (style as CSSProperties & { '--mobile-menu-progress': number })['--mobile-menu-progress'];
}

test('drawer follows the finger on the next frame, before release', () => {
  const f = fixture();
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.emit('touchmove', 162, 53);
  f.advance(16);
  assert.equal(f.render().dragging, true);
  assert.equal(menuProgress(f.nav.value.style), 12 / 400);
  assert.equal(f.isOpen(), false);
  f.emit('touchend', 162, 53);
  assert.equal(f.render().dragging, false);
  assert.equal(f.nav.value.style, undefined);
});

test('open and close swipes settle and remove fractional progress', () => {
  const f = fixture();
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.advance(150);
  f.emit('touchmove', 250);
  f.advance(16);
  assert.equal(menuProgress(f.render().style), 0.25);
  f.emit('touchend', 250);
  assert.equal(f.isOpen(), true);
  assert.equal(f.render().style, undefined);
  f.nav.value.closeGesture.onTouchStartCapture(f.touch(250));
  f.advance(150);
  f.emit('touchmove', 150);
  f.advance(16);
  assert.equal(menuProgress(f.render().style), 0.75);
  f.emit('touchend', 150);
  assert.equal(f.isOpen(), false);
  assert.equal(f.render().style, undefined);
});

for (const type of ['touchcancel', 'blur', 'pagehide', 'resize']) {
  test(`${type} clears partial dragging and accepts the next gesture`, () => {
    const f = fixture();
    f.nav.value.openGesture.onTouchStartCapture(f.touch());
    f.emit('touchmove', 210);
    f.advance(16);
    assert.equal(f.render().dragging, true);
    f.emit(type);
    assert.equal(f.render().style, undefined);
    assert.equal(f.isOpen(), false);
    f.nav.value.openGesture.onTouchStartCapture(f.touch());
    f.advance(150);
    f.emit('touchend', 250);
    assert.equal(f.isOpen(), true);
  });
}

test('route changes and external menu changes discard old progress and callbacks', () => {
  for (const change of ['navigate', 'setOpen'] as const) {
    const f = fixture();
    f.nav.value.openGesture.onTouchStartCapture(f.touch());
    f.emit('touchmove', 210);
    f.advance(16);
    assert.equal(f.render().dragging, true);
    if (change === 'navigate') f.navigate();
    else f.setOpen(true);
    assert.equal(f.render().style, undefined);
    f.emit('touchend', 250);
    assert.equal(f.isOpen(), change === 'setOpen');
  }
});

test('backgrounding and missing terminal events clear partial progress', () => {
  for (const background of [true, false]) {
    const f = fixture();
    f.nav.value.openGesture.onTouchStartCapture(f.touch());
    f.emit('touchmove', 210);
    f.advance(16);
    assert.equal(f.render().dragging, true);
    if (background) {
      f.document.hidden = true;
      f.document.dispatchEvent(new globalThis.Event('visibilitychange'));
    } else f.advance(10_000);
    assert.equal(f.render().style, undefined);
    assert.equal(f.isOpen(), false);
  }
});

test('short flick tolerates duplicate stationary moves at release', () => {
  const f = fixture();
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.advance(30);
  f.emit('touchmove', 178);
  f.advance(5);
  f.emit('touchmove', 178);
  f.advance(5);
  f.emit('touchend', 178);
  assert.equal(f.isOpen(), true);
});

test('paused short swipe settles back instead of committing a stale flick', () => {
  const f = fixture();
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.advance(30);
  f.emit('touchmove', 178);
  f.advance(150);
  f.emit('touchend', 178);
  assert.equal(f.isOpen(), false);
  assert.equal(f.render().style, undefined);
});

test('recognized horizontal movement tolerates diagonal drift; vertical scrolling cancels', () => {
  const f = fixture();
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.emit('touchmove', 162, 53);
  f.emit('touchmove', 210, 130);
  f.emit('touchend', 210, 130);
  assert.equal(f.isOpen(), true);
  f.setOpen(false);
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.emit('touchmove', 153, 80);
  f.emit('touchend', 250);
  assert.equal(f.isOpen(), false);
});

test('nested reply gesture receives movement and release without triggering long press', () => {
  const f = fixture();
  let replies = 0;
  let held = 0;
  const row = f.mount(f.useTouchGesture, {
    onSwipeLeft: () => {
      replies++;
    },
    onLongPress: () => {
      held++;
    },
  });
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  row.value.onTouchStart(f.touch());
  f.advance(100);
  f.emit('touchmove', 50);
  f.emit('touchend', 50);
  f.advance(600);
  assert.equal(replies, 1);
  assert.equal(held, 0);
  assert.equal(f.isOpen(), false);
  assert.equal(f.render().style, undefined);
});

test('second touch cancels a pending drag', () => {
  const f = fixture();
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.emit('touchmove', 210);
  f.advance(16);
  f.emit('touchstart', 160, 50, { touches: [{ identifier: 1 }, { identifier: 2 }] });
  f.emit('touchend', 250);
  assert.equal(f.isOpen(), false);
  assert.equal(f.render().style, undefined);
});

test('swiping over a button suppresses its click, while a tap stays usable', () => {
  const f = fixture();
  let prevented = 0;
  const click = {
    detail: 1,
    preventDefault: () => {
      prevented++;
    },
    stopPropagation() {},
  };
  f.nav.value.openGesture.onTouchStartCapture(
    f.touch(150, 50, {
      target: { closest: () => null },
    }),
  );
  f.emit('touchend');
  f.nav.value.openGesture.onClickCapture(f.click(click));
  assert.equal(prevented, 0);
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.advance(150);
  f.emit('touchend', 250);
  f.nav.value.openGesture.onClickCapture(f.click(click));
  assert.equal(prevented, 1);
});

test('after navigation a horizontal swipe prevents native scroll throughout diagonal drift', () => {
  const f = fixture();
  f.navigate();
  const [listener] = f.listeners('touchmove');
  assert.equal(f.listeners('touchmove').length, 1);
  assert.equal(listener.capture, true);
  assert.equal(listener.passive, false);
  f.beginTouch(f.touch(), f.nav.value.openGesture.onTouchStartCapture);
  assert.equal(f.emit('touchmove', 162, 53).defaultPrevented, true);
  f.advance(16);
  assert.equal(f.render().dragging, true);
  // WebKit also emits pointercancel when it starts recognizing native panning.
  // Touch tracking must not lose the gesture to that separate event stream.
  f.emit('pointercancel');
  assert.equal(f.emit('touchmove', 220, 150).defaultPrevented, true);
  f.advance(16);
  assert.equal(menuProgress(f.render().style), 70 / 400);
  f.emit('touchend', 220, 150);
  assert.equal(f.isOpen(), true);
  assert.equal(f.render().dragging, false);
  assert.equal(f.listeners('touchend').length, 0);
});

test('vertical intent releases the native scroll without preventing it', () => {
  const f = fixture();
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  assert.equal(f.emit('touchmove', 153, 80).defaultPrevented, false);
  assert.equal(f.listeners('touchend').length, 0);
  assert.equal(f.emit('touchmove', 210, 130).defaultPrevented, false);
  f.emit('touchend', 210, 130);
  assert.equal(f.isOpen(), false);
});

test('a swipe in an unsupported direction does not claim native scrolling', () => {
  const f = fixture();
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  assert.equal(f.emit('touchmove', 90).defaultPrevented, false);
  f.emit('touchend', 90);
  assert.equal(f.isOpen(), false);
});

test('native scroll already in progress cancels dragging without committing and allows a fresh swipe', () => {
  const f = fixture();
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.emit('touchmove', 210);
  f.advance(16);
  assert.equal(f.render().dragging, true);
  f.emit('touchmove', 250, 80, { cancelable: false });
  assert.equal(f.render().dragging, false);
  assert.equal(f.listeners('touchend').length, 0);
  f.emit('touchend', 250, 80);
  assert.equal(f.isOpen(), false);
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.emit('touchmove', 220);
  f.emit('touchend', 220);
  assert.equal(f.isOpen(), true);
});

test('an aborted partial swipe over a link cannot activate it on release', () => {
  const f = fixture();
  let prevented = false;
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.emit('touchmove', 162);
  f.advance(150);
  f.emit('touchend', 162);
  assert.equal(f.isOpen(), false);
  f.nav.value.openGesture.onClickCapture(
    f.click({
      detail: 1,
      preventDefault: () => {
        prevented = true;
      },
      stopPropagation() {},
    }),
  );
  assert.equal(prevented, true);
});

test('the blocking listener exists before the first touch and stays mounted across transitions', () => {
  const f = fixture();
  const listener = f.listeners('touchmove')[0];
  assert.ok(listener);
  assert.equal(listener.passive, false);
  for (let attempt = 0; attempt < 3; attempt++) {
    f.navigate();
    f.setOpen(false);
    f.beginTouch(f.touch(), f.nav.value.openGesture.onTouchStartCapture);
    assert.equal(f.emit('touchmove', 210).defaultPrevented, true);
    f.emit('touchend', 210);
    assert.equal(f.isOpen(), true);
    f.render();
    assert.equal(f.listeners('touchmove').length, 1);
    assert.equal(f.listeners('touchmove')[0], listener);
  }
});

test('long press surfaces do not create extra native move listeners or block scrolling', () => {
  const f = fixture();
  const surfaces = Array.from({ length: 30 }, () =>
    f.mount(f.useTouchGesture, { onLongPress() {} }),
  );
  assert.equal(f.listeners('touchmove').length, 1);
  f.beginTouch(f.touch(), surfaces[0].value.onTouchStart);
  assert.equal(f.emit('touchmove', 153, 80).defaultPrevented, false);
  for (const surface of surfaces) surface.unmount();
  assert.equal(f.listeners('touchmove').length, 1);
  f.nav.unmount();
  assert.equal(f.listeners('touchmove').length, 0);
});

test('a new intentional tap is not swallowed by the previous aborted swipe', () => {
  const f = fixture();
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.emit('touchmove', 162);
  f.emit('touchend', 162);
  f.nav.value.openGesture.onTouchStartCapture(f.touch());
  f.emit('touchend');
  let prevented = false;
  f.nav.value.openGesture.onClickCapture(
    f.click({
      detail: 1,
      preventDefault: () => {
        prevented = true;
      },
      stopPropagation() {},
    }),
  );
  assert.equal(prevented, false);
});
