import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type { PushPresence } from '../src/features/notifications/presence/PushPresence';

const source = ts.transpileModule(
  readFileSync(
    new URL('../src/features/notifications/presence/PushPresence.tsx', import.meta.url),
    'utf8',
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

type Report = { tab: string; focused: boolean };

/** One browser: tabs share the presence BroadcastChannel and the server-side request log. */
function browser() {
  const reports: Report[] = [];
  const channels = new Set<{ onmessage: (() => void) | null; tab: string }>();

  function openTab(tab: string, { focused = true, native = false, token = 'account-token' } = {}) {
    const window = new EventTarget();
    const document = Object.assign(new EventTarget(), {
      visibilityState: 'visible',
      focused,
      hasFocus: () => document.focused,
    });
    const intervals = new Map<number, () => void>();
    const timeouts = new Map<number, () => void>();
    let nextTimer = 0;
    Object.assign(window, {
      setInterval: (callback: () => void) => (intervals.set(++nextTimer, callback), nextTimer),
      clearInterval: (id: number) => intervals.delete(id),
      setTimeout: (callback: () => void) => (timeouts.set(++nextTimer, callback), nextTimer),
      clearTimeout: (id: number) => timeouts.delete(id),
    });

    class BroadcastChannel {
      onmessage: (() => void) | null = null;
      tab = tab;
      constructor() {
        channels.add(this);
      }
      postMessage() {
        for (const channel of channels) if (channel !== this) channel.onmessage?.();
      }
      close() {
        channels.delete(this);
      }
    }

    let account = token;
    let cleanups: (() => void)[] = [];
    const render = () => {
      cleanups.forEach((cleanup) => cleanup());
      cleanups = [];
      const refs: { current: unknown }[] = [];
      let refIndex = 0;
      const dependencies: Record<string, unknown> = {
        react: {
          useEffect: (effect: () => (() => void) | void) => {
            const cleanup = effect();
            if (cleanup) cleanups.push(cleanup);
          },
          useRef: (initial: unknown) => (refs[refIndex++] ??= { current: initial }),
        },
        '@/features/devices/browser-push': {
          useWebPush: () => ({ subscriptionId: 'subscription' }),
          updatePresence: async (_token: string, _id: string, presence: { focused: boolean }) => {
            reports.push({ tab, focused: presence.focused });
          },
        },
        '@/lib/app-shell': { getAppShell: () => ({ kind: native ? 'mobile' : 'browser' }) },
        '@/shared/hooks/useIsAttending': {
          isAttending: () => document.visibilityState === 'visible' && document.hasFocus(),
        },
        '@/shared/lib/nativeBridge': {
          postToNative: (message: { payload: { connected: boolean } }) =>
            reports.push({ tab, focused: message.payload.connected }),
        },
        '../../auth/stores/current-user-context': {
          useCurrentUser: () => ({ status: 'signed-in', accessToken: account }),
        },
        '../../realtime/stores/realtime-context': {
          useConnection: () => ({ status: 'connected' }),
        },
      };
      const exports = {} as { PushPresence: typeof PushPresence };
      runInNewContext(source, {
        exports,
        window,
        document,
        BroadcastChannel,
        require: (name: string) => {
          assert.ok(name in dependencies, `Unexpected import: ${name}`);
          return dependencies[name];
        },
      });
      exports.PushPresence();
    };
    render();

    return {
      focus: () => {
        document.focused = true;
        window.dispatchEvent(new Event('focus'));
      },
      blur: () => {
        document.focused = false;
        window.dispatchEvent(new Event('blur'));
      },
      close: () => window.dispatchEvent(new Event('pagehide')),
      renew: () => intervals.forEach((callback) => callback()),
      settle: () => {
        const pending = [...timeouts.values()];
        timeouts.clear();
        pending.forEach((callback) => callback());
      },
      refreshToken: (next: string) => {
        account = next;
        render();
      },
    };
  }

  return { reports, openTab };
}

test('the focused tab claims the lease and renews it while the user reads', () => {
  const b = browser();
  const tab = b.openTab('a');
  tab.renew();
  assert.deepEqual(b.reports, [
    { tab: 'a', focused: true },
    { tab: 'a', focused: true },
  ]);
});

test('a background tab never reports, so it cannot overwrite the reader', () => {
  const b = browser();
  b.openTab('a');
  const background = b.openTab('b', { focused: false });
  background.renew();
  background.settle();
  assert.deepEqual(b.reports, [{ tab: 'a', focused: true }]);
});

test('switching tabs hands the lease over without a stray release', () => {
  const b = browser();
  const first = b.openTab('a');
  const second = b.openTab('b', { focused: false });
  first.blur();
  second.focus();
  first.settle();
  assert.deepEqual(b.reports, [
    { tab: 'a', focused: true },
    { tab: 'b', focused: true },
  ]);
});

test('leaving the browser releases the lease after a short grace', () => {
  const b = browser();
  const tab = b.openTab('a');
  tab.blur();
  assert.equal(b.reports.length, 1);
  tab.settle();
  assert.deepEqual(b.reports.at(-1), { tab: 'a', focused: false });
});

test('closing the reading tab releases at once', () => {
  const b = browser();
  const tab = b.openTab('a');
  tab.close();
  assert.deepEqual(b.reports.at(-1), { tab: 'a', focused: false });
});

test('a token refresh does not churn a release before the renewed claim', () => {
  const b = browser();
  const tab = b.openTab('a');
  tab.refreshToken('refreshed-token');
  tab.settle();
  assert.ok(b.reports.every((report) => report.focused));
});

test('the native shell reports attention through the bridge', () => {
  const b = browser();
  const tab = b.openTab('native', { native: true });
  tab.blur();
  tab.settle();
  assert.deepEqual(b.reports, [
    { tab: 'native', focused: true },
    { tab: 'native', focused: false },
  ]);
});
