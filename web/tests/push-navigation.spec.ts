import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type { PushNavigation } from '../src/features/notifications/components/PushNavigation';

const channelId = '5824eb71-b12c-4f48-a30d-e15797b7116b';
const workspaceId = '630bba71-6807-445a-9dbe-aad85a050c09';
const route = `/channels/${channelId}?pushWorkspace=${workspaceId}`;

function compile(path: string) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
}

function page({ native }: { native: boolean }) {
  const window = { location: { origin: 'https://connect.test' } };
  const navigated: string[] = [];
  const toNative: unknown[] = [];
  const workerListeners: ((event: { data: unknown }) => void)[] = [];
  let nativeListener: ((message: unknown) => void) | undefined;

  const pushTarget = {} as { pushTarget: unknown };
  runInNewContext(compile('../src/features/notifications/push-target.ts'), {
    exports: pushTarget,
    URL,
    window,
  });

  const dependencies: Record<string, unknown> = {
    react: { useEffect: (effect: () => void) => effect() },
    'react/jsx-runtime': { jsx: () => null },
    'react-router-dom': {
      useLocation: () => ({ pathname: '/', search: '' }),
      useNavigate: () => (to: string) => navigated.push(to),
    },
    '@/features/auth/stores/current-user-context': {
      useCurrentUser: () => ({ status: 'signed-in', queryIdentity: 'reader' }),
    },
    '@/features/workspaces/hooks/useActiveWorkspace': {
      useActiveWorkspace: () => ({ workspaces: [{ id: workspaceId }] }),
    },
    '@/features/workspaces/stores/active-workspace-context': {
      useActiveWorkspaceId: () => ({ activeWorkspaceId: workspaceId, setActiveWorkspaceId() {} }),
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
    '../push-target': pushTarget,
  };
  const exports = {} as { PushNavigation: typeof PushNavigation };
  runInNewContext(compile('../src/features/notifications/components/PushNavigation.tsx'), {
    exports,
    window,
    URLSearchParams,
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
  exports.PushNavigation({ children: null });

  return {
    navigated,
    toNative: () => JSON.parse(JSON.stringify(toNative)),
    tapNative: (payload: unknown) => nativeListener?.({ type: 'notifications/open', payload }),
    clickBrowser: (url: string) =>
      workerListeners.forEach((listener) =>
        listener({ data: { type: 'notifications/open', url } }),
      ),
  };
}

test('a browser notification click routes the open app to the conversation, never elsewhere', () => {
  const p = page({ native: false });

  p.clickBrowser(`https://connect.test${route}&pushUser=reader`);
  p.clickBrowser('https://attacker.test/');

  assert.deepEqual(p.navigated, [`${route}&pushUser=reader`]);
  assert.deepEqual(p.toNative(), []);
});

test('a native tap is routed with its owner once the page says it is ready, and acknowledged', () => {
  const p = page({ native: true });
  const ready = p.toNative();

  p.tapNative({ eventId: 'event', userId: 'reader', url: route });

  assert.deepEqual(ready, [{ type: 'notifications/ready' }]);
  assert.deepEqual(p.navigated, [`${route}&pushUser=reader`]);
  assert.deepEqual(p.toNative().at(-1), { type: 'notifications/ack', eventId: 'event' });
});
