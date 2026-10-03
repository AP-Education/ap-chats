import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

export function createGestureFixture() {
  const window = new globalThis.EventTarget();
  const document = new globalThis.EventTarget();
  const nativeMessages = [];
  let selection = null;
  window.getSelection = () => selection;
  window.ReactNativeWebView = {
    postMessage: (data) => nativeMessages.push(JSON.parse(data)),
  };
  const listeners = new Map();
  const addListener = window.addEventListener.bind(window);
  const removeListener = window.removeEventListener.bind(window);
  window.addEventListener = (type, listener, options) => {
    const active = listeners.get(type) ?? new Map();
    active.set(listener, options);
    listeners.set(type, active);
    addListener(type, listener, options);
  };
  window.removeEventListener = (type, listener, options) => {
    listeners.get(type)?.delete(listener);
    removeListener(type, listener, options);
  };
  const timers = new Map();
  const effects = [];
  let now = 0;
  let nextTimer = 0;
  let owner;
  let touchSessionCancelable = true;

  function schedule(fn, delay = 0) {
    timers.set(++nextTimer, { at: now + delay, fn });
    return nextTimer;
  }

  function effect(fn, deps) {
    const index = owner.cursor++;
    const previous = owner.slots[index];
    if (!previous || !deps || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
      const slot = { deps, cleanup: previous?.cleanup };
      owner.slots[index] = slot;
      effects.push(() => {
        slot.cleanup?.();
        slot.cleanup = fn();
      });
    }
  }

  const react = {
    useRef(value) {
      return (owner.slots[owner.cursor++] ??= { current: value });
    },
    useState(value) {
      const slot = (owner.slots[owner.cursor++] ??= { value });
      return [
        slot.value,
        (next) => {
          slot.value = next;
        },
      ];
    },
    useEffect: effect,
    useLayoutEffect: effect,
  };

  function load(path, dependencies) {
    const exports = {};
    const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    runInNewContext(source, {
      exports,
      require: (name) => dependencies[name],
      window,
      document,
      setTimeout: schedule,
      clearTimeout: (id) => timers.delete(id),
      requestAnimationFrame: (fn) => schedule(fn, 16),
      cancelAnimationFrame: (id) => timers.delete(id),
    });
    return exports;
  }

  const { useTouchGesture } = load('../../src/shared/hooks/useTouchGesture.ts', { react });
  const { useMobileNavSheet } = load('../../src/layouts/MainLayout/useMobileNavSheet.ts', {
    react,
    '@/shared/hooks/useTouchGesture': { useTouchGesture },
  });

  const haptics = load('../../src/shared/lib/haptics.ts', {});
  const { useMessageReplySwipe } = load(
    '../../src/features/social/messaging/components/MessageRow/useMessageReplySwipe.ts',
    {
      react,
      '@/shared/hooks/useTouchGesture': { useTouchGesture },
      '@/shared/lib/haptics': haptics,
    },
  );
  const { useMobileMessageSelection } = load(
    '../../src/features/social/messaging/components/MessageTimeline/useMobileMessageSelection.ts',
    { react },
  );

  function mount(hook, initial) {
    const component = { cursor: 0, slots: [] };
    let options = initial;
    const renderer = {
      render(next = options) {
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

  function touch(x = 150, y = 50, extra = {}) {
    const point = { identifier: 1, clientX: x, clientY: y };
    return {
      touches: [point],
      changedTouches: [point],
      timeStamp: now,
      target: { closest: () => null },
      currentTarget: {},
      ...extra,
    };
  }

  function emit(type, x = 150, y = 50, extra = {}) {
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

  function advance(ms) {
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
  const nav = mount(useMobileNavSheet, options());
  return {
    nav,
    touch,
    emit,
    advance,
    document,
    mount,
    useTouchGesture,
    useMessageReplySwipe,
    useMobileMessageSelection,
    setSelection(value) {
      selection = value;
    },
    nativeMessages,
    setNativeBridge(bridge) {
      window.ReactNativeWebView = bridge;
    },
    listeners: (type) => [...(listeners.get(type)?.values() ?? [])],
    beginTouch(event, ...handlers) {
      touchSessionCancelable = [...(listeners.get('touchmove')?.values() ?? [])].some(
        (options) => options?.passive === false,
      );
      for (const handler of handlers) handler(event);
    },
    render: () => nav.render(options()),
    isOpen: () => open,
    setOpen(value) {
      open = value;
      return nav.render(options());
    },
    navigate() {
      locationKey = 'second';
      return nav.render(options());
    },
  };
}
