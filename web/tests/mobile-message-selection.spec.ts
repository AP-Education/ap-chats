import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createGestureFixture } from './fixtures/touch-gesture-runtime.ts';

function selectionFixture({ enabled = true, editing = false } = {}) {
  const runtime = createGestureFixture();
  const row = {};
  const root = Object.assign(new globalThis.EventTarget(), {
    querySelectorAll: () => (editing ? [] : [row]),
  });
  const options = { ref: { current: root }, enabled };
  const guard = runtime.mount(
    (next) =>
      runtime.useMobileMessageSelection(
        next.ref as unknown as { current: HTMLDivElement },
        next.enabled,
      ),
    options,
  );
  let cleared = 0;
  return {
    ...runtime,
    root,
    guard,
    options,
    cleared: () => cleared,
    changeSelection({ touchesMessage = true, editable = false, collapsed = false } = {}) {
      const selection = {
        isCollapsed: collapsed,
        rangeCount: 1,
        getRangeAt: () => ({
          commonAncestorContainer: {
            nodeType: 1,
            closest: () => (editable ? {} : null),
          },
          intersectsNode: (node: unknown) => touchesMessage && node === row,
        }),
        removeAllRanges() {
          cleared++;
          selection.isCollapsed = true;
        },
      };
      runtime.setSelection(selection);
      runtime.document.dispatchEvent(new globalThis.Event('selectionchange'));
      return selection;
    },
    startSelection({ editable = false, message = true } = {}) {
      const event = new globalThis.Event('selectstart', { cancelable: true });
      Object.defineProperty(event, 'target', {
        value: {
          nodeType: 1,
          closest: (selector: string) =>
            selector === '[data-message-readonly]' ? (message ? row : null) : editable ? {} : null,
        },
      });
      root.dispatchEvent(event);
      return event;
    },
  };
}

test('mobile message selection is stopped before the browser creates a range', () => {
  const f = selectionFixture();
  assert.equal(f.startSelection().defaultPrevented, true);
});

test('a native text selection in a readonly message is cleared', () => {
  const f = selectionFixture();
  f.changeSelection();
  assert.equal(f.cleared(), 1);
  f.document.dispatchEvent(new globalThis.Event('selectionchange'));
  assert.equal(f.cleared(), 1);
});

test('whole-page selections are cleared even when their endpoints are outside the message', () => {
  const f = selectionFixture();
  f.changeSelection({ touchesMessage: true });
  assert.equal(f.cleared(), 1);
});

test('the composer and other selections outside messages remain available', () => {
  const f = selectionFixture();
  f.changeSelection({ touchesMessage: false });
  assert.equal(f.cleared(), 0);
  assert.equal(f.startSelection({ message: false }).defaultPrevented, false);
});

test('editable fields and the caret are preserved', () => {
  const f = selectionFixture();
  f.changeSelection({ editable: true });
  f.changeSelection({ collapsed: true });
  assert.equal(f.cleared(), 0);
  assert.equal(f.startSelection({ editable: true }).defaultPrevented, false);
});

test('editing rows without the readonly marker keep text selection', () => {
  const f = selectionFixture({ editing: true });
  f.changeSelection();
  assert.equal(f.cleared(), 0);
  assert.equal(f.startSelection({ message: false }).defaultPrevented, false);
});

test('desktop keeps native text selection', () => {
  const f = selectionFixture({ enabled: false });
  f.changeSelection();
  assert.equal(f.cleared(), 0);
  assert.equal(f.startSelection().defaultPrevented, false);
});

test('switching to desktop removes the mobile selection handlers', () => {
  const f = selectionFixture();
  f.guard.render({ ...f.options, enabled: false });
  f.changeSelection();
  assert.equal(f.cleared(), 0);
  assert.equal(f.startSelection().defaultPrevented, false);
});

test('unmount removes selection handlers', () => {
  const f = selectionFixture();
  f.guard.unmount();
  f.changeSelection();
  assert.equal(f.cleared(), 0);
  assert.equal(f.startSelection().defaultPrevented, false);
});
