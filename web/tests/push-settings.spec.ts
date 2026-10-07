import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { createElement, type ReactNode } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

import type { BrowserPushState } from '../src/features/devices/browser-push/browser-push-context';
import type { PushSettings } from '../src/features/notifications/PushSettings';

for (const permission of ['default', 'denied', 'granted'] as const) {
  test(`the notification button requests permission when notifications are off and browser permission is ${permission}`, () => {
    let enabled = 0;
    let onClick: (() => void) | undefined;
    const push: BrowserPushState = {
      available: true,
      enabled: false,
      busy: false,
      permission,
      error: null,
      subscriptionId: null,
      enable: async () => {
        enabled++;
      },
      disable: async () => {
        assert.fail('An inactive subscription should not be disabled');
      },
    };
    const dependencies: Record<string, unknown> = {
      'react/jsx-runtime': jsxRuntime,
      '@phosphor-icons/react': { BellIcon: () => null, BellSlashIcon: () => null },
      '@/features/devices/browser-push': { useWebPush: () => push },
      '@/shared/hooks/useIsMobile': { useIsMobile: () => false },
      '@/shared/ui/IconButton': {
        IconButton: (props: {
          onClick?: () => void;
          disabled?: boolean;
          'aria-label'?: string;
        }) => {
          onClick = props.onClick;
          return createElement('button', {
            disabled: props.disabled,
            'aria-label': props['aria-label'],
          });
        },
      },
      antd: {
        Tooltip: ({ children }: { children: ReactNode }) => children,
        Popover: ({ children }: { children: ReactNode }) => children,
      },
    };
    const exports = {} as { PushSettings: typeof PushSettings };
    const source = ts.transpileModule(
      readFileSync(
        new URL('../src/features/notifications/PushSettings.tsx', import.meta.url),
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
    runInNewContext(source, {
      exports,
      require: (name: string) => {
        assert.ok(name in dependencies, `Unexpected import: ${name}`);
        return dependencies[name];
      },
    });

    const html = renderToStaticMarkup(createElement(exports.PushSettings));
    assert.match(html, /aria-label="Увімкнути сповіщення"/);
    assert.doesNotMatch(html, /disabled/);
    assert.ok(onClick, 'Clicking the bell must call the enable action');
    onClick();
    assert.equal(enabled, 1);
  });
}
