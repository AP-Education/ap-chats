import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';

import type * as GestureModule from '@ap-education/ui';
import type { MouseEvent, TouchEvent } from 'react';
import ts from 'typescript';

import type * as ReplySwipeModule from '../../src/features/social/messaging/components/MessageRow/useMessageReplySwipe';
import type * as SelectionModule from '../../src/features/social/messaging/components/MessageTimeline/useMobileMessageSelection';

interface HookSlot {
  current?: unknown;
  value?: unknown;
  deps?: readonly unknown[];
  cleanup?: (() => void) | void;
}

export interface SelectionSnapshot {
  isCollapsed: boolean;
  rangeCount: number;
  getRangeAt: (index: number) => {
    commonAncestorContainer: { nodeType: number; closest: (selector: string) => unknown };
    intersectsNode: (node: unknown) => boolean;
  };
  removeAllRanges: () => void;
}

type NativeBridge = { postMessage: (data: string) => void };
type TouchOverrides = Record<string, unknown> & {
  cancelable?: boolean;
  target?: { closest: (selector: string) => unknown };
};

export function createGestureFixture() {
  const nativeMessages: unknown[] = [];
  let selection: SelectionSnapshot | null = null;
  const window = Object.assign(new globalThis.EventTarget(), {
    getSelection: () => selection,
    ReactNativeWebView: {
      postMessage: (data: string) => nativeMessages.push(JSON.parse(data)),
    } as NativeBridge | undefined,
  });
  const document = Object.assign(new globalThis.EventTarget(), { hidden: false });
  const listeners = new Map<
    string,
    Map<EventListenerOrEventListenerObject | null, AddEventListenerOptions>
  >();
  const addListener = window.addEventListener.bind(window);
  const removeListener = window.removeEventListener.bind(window);
  window.addEventListener = (type, listener, options) => {
    const active = listeners.get(type) ?? new Map();
    active.set(listener, typeof options === 'boolean' ? { capture: options } : (options ?? {}));
    listeners.set(type, active);
    addListener(type, listener, options);
  };
  window.removeEventListener = (type, listener, options) => {
    listeners.get(type)?.delete(listener);
    removeListener(type, listener, options);
  };
  const timers = new Map<number, { at: number; fn: () => void }>();
  const effects: (() => void)[] = [];
  let now = 0;
  let nextTimer = 0;
  let owner: { cursor: number; slots: HookSlot[] };
  let touchSessionCancelable = true;

  function schedule(fn: () => void, delay = 0) {
    timers.set(++nextTimer, { at: now + delay, fn });
    return nextTimer;
  }

  function effect(fn: () => void | (() => void), deps?: readonly unknown[]) {
    const index = owner.cursor++;
    const previous = owner.slots[index];
    if (!previous || !deps || deps.some((dep, i) => !Object.is(dep, previous.deps?.[i]))) {
      const slot = { deps, cleanup: previous?.cleanup };
      owner.slots[index] = slot;
      effects.push(() => {
        slot.cleanup?.();
        slot.cleanup = fn();
      });
    }
  }

  const react = {
    useRef<T>(value: T) {
      return (owner.slots[owner.cursor++] ??= { current: value }) as { current: T };
    },
    useState<T>(value: T): [T, (next: T) => void] {
      const slot = (owner.slots[owner.cursor++] ??= { value });
      return [
        slot.value as T,
        (next: T) => {
          slot.value = next;
        },
      ];
    },
    useEffect: effect,
    useLayoutEffect: effect,
  };

  function load<T>(path: string, dependencies: Record<string, unknown>): T {
    const exports = {};
    const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    runInNewContext(source, {
      exports,
      require: (name: string) => dependencies[name],
      window,
      document,
      setTimeout: schedule,
      clearTimeout: (id: number) => timers.delete(id),
      requestAnimationFrame: (fn: () => void) => schedule(fn, 16),
      cancelAnimationFrame: (id: number) => timers.delete(id),
    });
    return exports as T;
  }

  const { useTouchGesture } = load<typeof GestureModule>(
    new URL('./hooks/useTouchGesture.js', import.meta.resolve('@ap-education/ui')).href,
    { react },
  );
  const { useSwipeDrawer } = load<typeof GestureModule>(
    new URL('./hooks/useSwipeDrawer.js', import.meta.resolve('@ap-education/ui')).href,
    {
      react,
      './useTouchGesture': { useTouchGesture },
    },
  );

  const haptics = load('../../src/shared/lib/haptics.ts', {});
  const { useMessageReplySwipe } = load<typeof ReplySwipeModule>(
    '../../src/features/social/messaging/components/MessageRow/useMessageReplySwipe.ts',
    {
      react,
      '@ap-education/ui': { useTouchGesture },
      '@/shared/lib/haptics': haptics,
    },
  );
  const { useMobileMessageSelection } = load<typeof SelectionModule>(
    '../../src/features/social/messaging/components/MessageTimeline/useMobileMessageSelection.ts',
    { react },
  );

  function mount<Options, Value>(hook: (options: Options) => Value, initial: Options) {
    const component: typeof owner = { cursor: 0, slots: [] };
    let options = initial;
    const renderer = {
      value: undefined as Value,
      render(next = options): Value {
        options = next;
        owner = component;
        component.cursor = 0;
        renderer.value = hook(options);
        for (const run of effects.splice(0)) run();
        return renderer.value;
      },
      unmount() {
        for (const slot of component.slots) slot.cleanup?.();
      },
    };
    renderer.render();
    return renderer;
  }

  function touch(x = 150, y = 50, extra: TouchOverrides = {}): TouchEvent<HTMLElement> {
    const point = { identifier: 1, clientX: x, clientY: y };
    return {
      touches: [point],
      changedTouches: [point],
      timeStamp: now,
      target: { closest: () => null },
      currentTarget: {},
      ...extra,
    } as unknown as TouchEvent<HTMLElement>;
  }

  function emit(type: string, x = 150, y = 50, extra: TouchOverrides = {}) {
    const event = new globalThis.Event(type, {
      cancelable: extra.cancelable ?? (type === 'touchmove' ? touchSessionCancelable : true),
    });
    const data = touch(x, y, {
      touches: type === 'touchend' || type === 'touchcancel' ? [] : undefined,
      ...extra,
    });
    data.touches ??= touch(x, y).touches;
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'target' && key !== 'currentTarget') Object.defineProperty(event, key, { value });
    }
    window.dispatchEvent(event);
    return event;
  }

  function advance(ms: number) {
    const end = now + ms;
    while (true) {
      const next = [...timers]
        .filter(([, timer]) => timer.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].fn();
    }
    now = end;
  }

  let open = false;
  let locationKey = 'first';
  const options = () => ({
    enabled: true,
    open,
    locationKey,
    onOpen: () => {
      open = true;
    },
    onClose: () => {
      open = false;
    },
    getWidth: () => 400,
  });
  const nav = mount(useSwipeDrawer, options());
  return {
    nav,
    touch,
    click: (
      event: Pick<MouseEvent<HTMLElement>, 'detail' | 'preventDefault' | 'stopPropagation'>,
    ) => event as MouseEvent<HTMLElement>,
    emit,
    advance,
    document,
    mount,
    useTouchGesture,
    useMessageReplySwipe,
    useMobileMessageSelection,
    setSelection(value: SelectionSnapshot) {
      selection = value;
    },
    nativeMessages,
    setNativeBridge(bridge: NativeBridge | undefined) {
      window.ReactNativeWebView = bridge;
    },
    listeners: (type: string) => [...(listeners.get(type)?.values() ?? [])],
    beginTouch(
      event: TouchEvent<HTMLElement>,
      ...handlers: ((event: TouchEvent<HTMLElement>) => void)[]
    ) {
      touchSessionCancelable = [...(listeners.get('touchmove')?.values() ?? [])].some(
        (options) => options?.passive === false,
      );
      for (const handler of handlers) handler(event);
    },
    render: () => nav.render(options()),
    isOpen: () => open,
    setOpen(value: boolean) {
      open = value;
      return nav.render(options());
    },
    navigate() {
      locationKey = 'second';
      return nav.render(options());
    },
  };
}
