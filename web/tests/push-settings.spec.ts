import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { createElement, type ReactNode } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

import type { PushSettings } from '../src/features/notifications/components/PushSettings';
import type { PushState } from '../src/features/notifications/hooks/usePush';

const source = ts.transpileModule(
  readFileSync(
    new URL('../src/features/notifications/components/PushSettings.tsx', import.meta.url),
    'utf8',
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;

function render(push: Partial<PushState>, error: string | null = null) {
  let toggled = 0;
  let onClick: (() => void) | undefined;
  const state: PushState = {
    available: true,
    enabled: false,
    permission: 'default',
    subscriptionId: null,
    publicKey: 'vapid',
    synchronizationFailed: false,
    ...push,
  };
  const dependencies: Record<string, unknown> = {
    'react/jsx-runtime': jsxRuntime,
    '@phosphor-icons/react': { BellIcon: () => null },
    '../hooks/usePush': { usePush: () => state },
    '../hooks/usePushToggle': {
      usePushToggle: () => ({ busy: false, error, toggle: () => toggled++ }),
    },
    '@/shared/hooks/useIsMobile': { useIsMobile: () => false },
    '@/shared/ui/IconButton': {
      IconButton: (props: { onClick?: () => void; 'aria-label'?: string }) => {
        onClick = props.onClick;
        return createElement('button', { 'aria-label': props['aria-label'] });
      },
    },
    antd: {
      Tooltip: ({ title, children }: { title: string; children: ReactNode }) =>
        createElement('span', { title }, children),
      Spin: () => null,
    },
  };
  const exports = {} as { PushSettings: typeof PushSettings };
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });

  const html = renderToStaticMarkup(createElement(exports.PushSettings));
  return { html, click: () => onClick?.(), toggled: () => toggled };
}

for (const permission of ['default', 'denied', 'granted'] as const) {
  test(`the bell offers to turn push on when it is off and permission is ${permission}`, () => {
    const view = render({ permission });
    assert.match(view.html, /aria-label="Увімкнути сповіщення"/);
    view.click();
    assert.equal(view.toggled(), 1);
  });
}

test('the bell explains a failure instead of the plain label', () => {
  const view = render({ enabled: true }, 'Не вдалося вимкнути сповіщення. Спробуйте ще раз.');
  assert.match(view.html, /aria-label="Вимкнути сповіщення"/);
  assert.match(view.html, /title="Не вдалося вимкнути/);
});

test('the bell is hidden where push is unavailable', () => {
  assert.equal(render({ available: false }).html, '');
});
