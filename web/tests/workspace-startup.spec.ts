import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import type { PropsWithChildren, ReactElement } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

function load<T>(path: string, dependencies: Record<string, unknown>): T {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      if (name === 'react/jsx-runtime') return jsxRuntime;
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return exports as T;
}

const fallback = 'loading';

test('workspace startup waits for initial data but preserves the app during refresh and errors', () => {
  let query = { isPending: true, isFetched: false, isFetching: true, isError: false };
  const { WorkspaceStartup } = load<{
    WorkspaceStartup: (
      props: PropsWithChildren<{ fallback: string }>,
    ) => ReactElement<{ children?: string }> | string;
  }>('../src/app/WorkspaceStartup.tsx', {
    '../features/workspaces/hooks/useWorkspaces': { useWorkspaces: () => query },
  });
  assert.equal(WorkspaceStartup({ children: 'app', fallback }), fallback);
  for (const state of [
    { isPending: false, isFetched: true, isFetching: false, isError: false },
    { isPending: false, isFetched: true, isFetching: true, isError: false },
    { isPending: false, isFetched: true, isFetching: false, isError: true },
    { isPending: true, isFetched: true, isFetching: true, isError: false },
  ]) {
    query = state;
    const shown = WorkspaceStartup({ children: 'app', fallback });
    assert.equal(typeof shown === 'string' ? shown : shown.props.children, 'app');
  }
});
