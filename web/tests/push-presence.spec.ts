import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type { PushPresence } from '../src/features/notifications/presence/PushPresence';

const channelId = '5824eb71-b12c-4f48-a30d-e15797b7116b';
const workspaceId = '630bba71-6807-445a-9dbe-aad85a050c09';

function fixture(native = false) {
  const window = new EventTarget();
  const document = Object.assign(new EventTarget(), {
    visibilityState: 'visible',
    focused: true,
    hasFocus: () => document.focused,
  });
  const requests: { token: string; id: string; presence: { focused: boolean } }[] = [];
  const messages: { payload: { connected: boolean } }[] = [];
  const timers = new Map<number, () => void>();
  Object.assign(window, {
    setInterval: (callback: () => void, delay: number) => {
      assert.equal(delay, 30000);
      timers.set(1, callback);
      return 1;
    },
  });
  if (native) {
    Object.assign(window, {
      ReactNativeWebView: { postMessage: (value: string) => messages.push(JSON.parse(value)) },
    });
  }
  let cleanup: (() => void) | undefined;
  const dependencies: Record<string, unknown> = {
    react: { useEffect: (effect: () => () => void) => (cleanup = effect()) },
    'react-router-dom': { useLocation: () => ({ pathname: `/channels/${channelId}` }) },
    '@/features/devices/browser-push': {
      useWebPush: () => ({ subscriptionId: 'subscription' }),
      updatePresence: async (token: string, id: string, presence: { focused: boolean }) => {
        requests.push({ token, id, presence });
      },
    },
    '@/lib/app-shell': { getAppShell: () => ({ kind: native ? 'mobile' : 'browser' }) },
    '../../auth/stores/current-user-context': {
      useCurrentUser: () => ({ status: 'signed-in', accessToken: 'account-token' }),
    },
    '../../realtime/stores/realtime-context': {
      useConnection: () => ({ status: 'connected' }),
    },
    '../../workspaces/hooks/useActiveWorkspace': {
      useActiveWorkspace: () => ({ workspace: { id: workspaceId } }),
    },
  };
  const exports = {} as { PushPresence: typeof PushPresence };
  const source = ts.transpileModule(
    readFileSync(
      new URL('../src/features/notifications/presence/PushPresence.tsx', import.meta.url),
      'utf8',
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  runInNewContext(source, {
    exports,
    window,
    document,
    clearInterval: (id: number) => timers.delete(id),
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  exports.PushPresence();
  return {
    window,
    document,
    requests,
    messages,
    tick: () => timers.get(1)?.(),
    unmount: () => cleanup?.(),
  };
}

test('closing a page immediately clears foreground presence and pageshow restores it', () => {
  const f = fixture();
  assert.equal(f.requests.at(-1)?.presence.focused, true);
  f.window.dispatchEvent(new Event('pagehide'));
  assert.equal(f.requests.at(-1)?.presence.focused, false);
  f.window.dispatchEvent(new Event('pageshow'));
  assert.equal(f.requests.at(-1)?.presence.focused, true);
  assert.ok(
    f.requests.every(({ token, id }) => token === 'account-token' && id === 'subscription'),
  );
});

test('hidden and unfocused pages release the lease while focused pages renew it', () => {
  const f = fixture();
  f.document.visibilityState = 'hidden';
  f.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.requests.at(-1)?.presence.focused, false);
  f.document.visibilityState = 'visible';
  f.document.focused = false;
  f.window.dispatchEvent(new Event('blur'));
  assert.equal(f.requests.at(-1)?.presence.focused, false);
  f.document.focused = true;
  f.window.dispatchEvent(new Event('focus'));
  f.tick();
  assert.equal(f.requests.at(-1)?.presence.focused, true);
});

test('unmount clears the lease, timer and page lifecycle listeners', () => {
  const f = fixture();
  f.unmount();
  assert.equal(f.requests.at(-1)?.presence.focused, false);
  const count = f.requests.length;
  f.window.dispatchEvent(new Event('pagehide'));
  f.window.dispatchEvent(new Event('pageshow'));
  f.tick();
  assert.equal(f.requests.length, count);
});

test('native presence goes through the bridge rather than browser subscription requests', () => {
  const f = fixture(true);
  assert.equal(f.messages.at(-1)?.payload.connected, true);
  f.window.dispatchEvent(new Event('pagehide'));
  assert.equal(f.messages.at(-1)?.payload.connected, false);
  assert.equal(f.requests.length, 0);
});
