import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type { PushNavigation } from '../src/features/notifications/components/PushNavigation';

const channelId = '5824eb71-b12c-4f48-a30d-e15797b7116b';
const workspaceId = '630bba71-6807-445a-9dbe-aad85a050c09';
const target = { type: 'conversation', workspaceId, channelId, kind: 'channel' };

function compile(path: string) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
}

function page({ native = false, search = '' } = {}) {
  const navigated: { to: string; replace: boolean }[] = [];
  const workspaces: string[] = [];
  const toNative: unknown[] = [];
  const workerListeners: ((event: { data: unknown }) => void)[] = [];
  let nativeListener: ((message: unknown) => void) | undefined;

  const route = {} as { notificationRoute: unknown };
  runInNewContext(compile('../src/features/notifications/notification-route.ts'), {
    exports: route,
  });

  const dependencies: Record<string, unknown> = {
    react: {
      useEffect: (effect: () => void) => effect(),
      useEffectEvent: (handler: unknown) => handler,
    },
    'react/jsx-runtime': { jsx: () => 'loading' },
    'react-router-dom': {
      useLocation: () => ({ pathname: '/', search }),
      useNavigate: () => (to: string, options?: { replace?: boolean }) =>
        navigated.push({ to, replace: Boolean(options?.replace) }),
    },
    '@/features/auth/stores/current-user-context': {
      useCurrentUser: () => ({ status: 'signed-in', queryIdentity: 'reader' }),
    },
    '@/features/workspaces/hooks/useActiveWorkspace': {
      useActiveWorkspace: () => ({ workspaces: [{ id: workspaceId }] }),
    },
    '@/features/workspaces/stores/active-workspace-context': {
      useActiveWorkspaceId: () => ({ setActiveWorkspaceId: (id: string) => workspaces.push(id) }),
    },
    '@/shared/lib/nativeBridge': {
      isNativeShell: () => native,
      onNativeMessage: (listener: (message: unknown) => void) => {
        nativeListener = listener;
        return () => undefined;
      },
      postToNative: (message: unknown) => toNative.push(message),
    },
    '@/shared/ui/AppLoading/AppLoading': { AppLoading: () => null },
    '../notification-route': route,
  };
  const exports = {} as { PushNavigation: typeof PushNavigation };
  runInNewContext(compile('../src/features/notifications/components/PushNavigation.tsx'), {
    exports,
    URLSearchParams,
    JSON,
    navigator: {
      serviceWorker: {
        addEventListener: (_type: string, listener: (event: { data: unknown }) => void) =>
          workerListeners.push(listener),
        removeEventListener: () => undefined,
      },
    },
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  const rendered = exports.PushNavigation({ children: 'app' });

  return {
    rendered,
    navigated,
    workspaces,
    toNative: () => JSON.parse(JSON.stringify(toNative)),
    tapNative: (payload: unknown) => nativeListener?.({ type: 'notifications/open', payload }),
    clickBrowser: (tap: object) =>
      workerListeners.forEach((listener) =>
        listener({ data: { type: 'notifications/open', ...tap } }),
      ),
  };
}

test('a browser click opens the conversation in its workspace, only for this account', () => {
  const p = page();

  p.clickBrowser({ userId: 'reader', target });
  p.clickBrowser({ userId: 'previous-account', target });
  p.clickBrowser({ userId: 'reader', target: { ...target, workspaceId: crypto.randomUUID() } });

  assert.deepEqual(p.workspaces, [workspaceId]);
  assert.deepEqual(p.navigated, [{ to: `/channels/${channelId}`, replace: false }]);
});

test('a native tap is routed once the page says it is ready, and acknowledged', () => {
  const p = page({ native: true });
  const ready = p.toNative();

  p.tapNative({ eventId: 'event', userId: 'reader', target });

  assert.deepEqual(ready, [{ type: 'notifications/ready' }]);
  assert.deepEqual(p.navigated, [{ to: `/channels/${channelId}`, replace: false }]);
  assert.deepEqual(p.toNative().at(-1), { type: 'notifications/ack', eventId: 'event' });
});

test('an app started by a tap waits, then replaces its launch URL with the conversation', () => {
  const launch = encodeURIComponent(JSON.stringify({ userId: 'reader', target }));
  const p = page({ search: `?notification=${launch}` });

  assert.equal(p.rendered, 'loading');
  assert.deepEqual(p.navigated, [{ to: `/channels/${channelId}`, replace: true }]);
});

test('a launch tap for someone else lands at home', () => {
  const launch = encodeURIComponent(JSON.stringify({ userId: 'someone-else', target }));
  const p = page({ search: `?notification=${launch}` });

  assert.deepEqual(p.navigated, [{ to: '/', replace: true }]);
});
