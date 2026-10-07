import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { User } from 'oidc-client-ts';
import type { PropsWithChildren, ReactElement } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import type { AuthContextProps } from 'react-oidc-context';
import ts from 'typescript';

import { safeReturnTo } from '../src/features/auth/api/return-to';
import type { CurrentUserState } from '../src/features/auth/types';

function load<T>(path: string, dependencies: Record<string, unknown>, globals = {}): T {
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
    ...globals,
  });
  return exports as T;
}

function AppLoading() {
  return null;
}

function AuthFailureScreen() {
  return null;
}

type AuthSnapshot = Pick<
  AuthContextProps,
  'isLoading' | 'isAuthenticated' | 'user' | 'error' | 'signinRedirect'
>;

function snapshot(overrides: Partial<AuthSnapshot> = {}): AuthSnapshot {
  return {
    isLoading: true,
    isAuthenticated: false,
    user: null,
    signinRedirect: async () => {},
    ...overrides,
  };
}

function user(expiresIn = 300) {
  return new User({
    access_token: 'access-token',
    token_type: 'Bearer',
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    profile: { iss: 'https://accounts.test', aud: 'chats', sub: 'user', iat: 0, exp: 0 },
    userState: { returnTo: '/direct/channel?message=42#reply' },
  });
}

function callbackError(message: string) {
  return Object.assign(new Error(message), { source: 'signinCallback' as const });
}

function callbackFixture(initial: AuthSnapshot) {
  let auth = initial;
  let authParams = false;
  const effects: (() => void)[] = [];
  const navigations: { to: string; replace: boolean }[] = [];
  const { AuthCallback } = load<{
    AuthCallback: () => ReactElement<{ onRetry?: () => void }>;
  }>('../src/features/auth/components/AuthCallback.tsx', {
    react: { useEffect: (effect: () => void) => effects.push(effect) },
    'react-oidc-context': { useAuth: () => auth, hasAuthParams: () => authParams },
    'react-router-dom': {
      useNavigate: () => (to: string, options: { replace: boolean }) =>
        navigations.push({ to, replace: options.replace }),
    },
    '@/shared/ui/AppLoading/AppLoading': { AppLoading },
    '../api/return-to': { safeReturnTo },
    './AuthFailureScreen': { AuthFailureScreen },
  });
  return {
    navigations,
    render(next = auth) {
      auth = next;
      return AuthCallback();
    },
    flush: () => effects.splice(0).forEach((effect) => effect()),
    setAuthParams: (present: boolean) => {
      authParams = present;
    },
  };
}

test('callback keeps the loading surface until token processing finishes', () => {
  const f = callbackFixture(snapshot());
  assert.equal(f.render().type, AppLoading);
  f.flush();
  assert.deepEqual(f.navigations, []);
  assert.equal(
    f.render(snapshot({ isLoading: false, isAuthenticated: true, user: user() })).type,
    AppLoading,
  );
  f.flush();
  assert.deepEqual(f.navigations, [{ to: '/direct/channel?message=42#reply', replace: true }]);
});

test('a failed or expired callback shows a retry instead of looping or waiting forever', () => {
  for (const state of [
    snapshot({ error: callbackError('Code exchange failed') }),
    snapshot({ isLoading: false }),
    snapshot({ isLoading: false, isAuthenticated: true, user: user(-300) }),
    snapshot({
      isLoading: false,
      isAuthenticated: true,
      user: user(),
      error: callbackError('Callback validation failed'),
    }),
  ]) {
    const f = callbackFixture(state);
    assert.equal(f.render().type, AuthFailureScreen);
    f.flush();
    assert.deepEqual(f.navigations, []);
  }
});

test('an early user-loaded event cannot navigate before callback URL cleanup completes', () => {
  const f = callbackFixture(snapshot({ isLoading: false, isAuthenticated: true, user: user() }));
  f.setAuthParams(true);
  assert.equal(f.render().type, AppLoading);
  f.flush();
  assert.deepEqual(f.navigations, []);
  f.setAuthParams(false);
  assert.equal(f.render().type, AppLoading);
  f.flush();
  assert.deepEqual(f.navigations, [{ to: '/direct/channel?message=42#reply', replace: true }]);
});

test('callback retry starts a new authorization without reusing the consumed code', () => {
  const redirects: unknown[] = [];
  const f = callbackFixture(
    snapshot({
      error: callbackError('Code exchange failed'),
      signinRedirect: async (args) => {
        redirects.push(structuredClone(args));
      },
    }),
  );
  const result = f.render();
  assert.ok(result.props.onRetry);
  result.props.onRetry();
  assert.deepEqual(redirects, [{ state: { returnTo: '/' } }]);
});

test('callback cleanup preserves router history and never reloads the document', () => {
  const historyState = { idx: 2, key: 'callback' };
  const replacements: unknown[] = [];
  const { OidcProvider } = load<{
    OidcProvider: (props: PropsWithChildren) => ReactElement<{ onSigninCallback: () => void }>;
  }>(
    '../src/features/auth/providers/OidcProvider.tsx',
    {
      'oidc-client-ts': { WebStorageStateStore: class {} },
      'react-oidc-context': { AuthProvider: 'provider' },
      '../api/oidc-config': {
        getOidcConfig: () => ({
          issuer: 'https://accounts.test',
          clientId: 'chats',
          audience: 'api',
        }),
      },
    },
    {
      window: {
        sessionStorage: {},
        location: {
          origin: 'https://chats.test',
          pathname: '/auth/callback',
          replace() {
            assert.fail('Callback must not reload the document');
          },
        },
        history: {
          state: historyState,
          replaceState: (...args: unknown[]) => replacements.push(args),
        },
      },
    },
  );
  OidcProvider({}).props.onSigninCallback();
  assert.deepEqual(replacements, [[historyState, '', '/auth/callback']]);
});

test('silent token renewal keeps a valid user signed in and switches to the renewed token', () => {
  let auth = snapshot({ isLoading: true, isAuthenticated: true, user: user() });
  const { OidcCurrentUserProvider } = load<{
    OidcCurrentUserProvider: (
      props: PropsWithChildren,
    ) => ReactElement<{ value: CurrentUserState }>;
  }>('../src/features/auth/providers/OidcCurrentUserProvider.tsx', {
    'react-oidc-context': { useAuth: () => auth },
    '../stores/current-user-context': { CurrentUserContext: { Provider: 'provider' } },
    '../stores/sign-out-tasks': { runSignOutTasks: async () => undefined },
  });
  const current = OidcCurrentUserProvider({}).props.value;
  assert.equal(current.status, 'signed-in');
  assert.equal(current.accessToken, 'access-token');
  const renewed = user();
  renewed.access_token = 'renewed-token';
  auth = snapshot({ isLoading: false, isAuthenticated: true, user: renewed });
  const next = OidcCurrentUserProvider({}).props.value;
  assert.equal(next.status, 'signed-in');
  assert.equal(next.accessToken, 'renewed-token');
  auth = snapshot({ isLoading: true, isAuthenticated: true, user: user(-300) });
  assert.equal(OidcCurrentUserProvider({}).props.value.status, 'loading');
});

test('automatic sign-in starts only once across repeated effects and never retries an error', () => {
  let redirects = 0;
  const signIn = () => {
    redirects++;
  };
  let current: CurrentUserState = { status: 'signed-out', retry: false, signIn };
  const ref = { current: false };
  const { RequireAuth } = load<{
    RequireAuth: (props: PropsWithChildren) => ReactElement<{ onRetry?: () => void }>;
  }>('../src/features/auth/components/RequireAuth.tsx', {
    react: { useEffect: (effect: () => void) => effect(), useRef: () => ref },
    '@/shared/ui/AppLoading/AppLoading': { AppLoading },
    '../stores/current-user-context': { useCurrentUser: () => current },
    './AuthFailureScreen': { AuthFailureScreen },
  });
  assert.equal(RequireAuth({}).type, AppLoading);
  RequireAuth({});
  assert.equal(redirects, 1);
  current = { status: 'signed-out', retry: true, signIn };
  const failure = RequireAuth({});
  assert.equal(failure.type, AuthFailureScreen);
  assert.equal(redirects, 1);
  assert.ok(failure.props.onRetry);
  failure.props.onRetry();
  assert.equal(redirects, 2);
});

test('workspace startup waits for initial data but preserves the app during refresh and errors', () => {
  let query = { isPending: true, isFetched: false, isFetching: true, isError: false };
  const { WorkspaceStartup } = load<{
    WorkspaceStartup: (props: PropsWithChildren) => ReactElement<{ children?: string }>;
  }>('../src/app/WorkspaceStartup.tsx', {
    '../features/workspaces/hooks/useWorkspaces': { useWorkspaces: () => query },
    '../shared/ui/AppLoading/AppLoading': { AppLoading },
  });
  assert.equal(WorkspaceStartup({ children: 'app' }).type, AppLoading);
  for (const state of [
    { isPending: false, isFetched: true, isFetching: false, isError: false },
    { isPending: false, isFetched: true, isFetching: true, isError: false },
    { isPending: false, isFetched: true, isFetching: false, isError: true },
    { isPending: true, isFetched: true, isFetching: true, isError: false },
  ]) {
    query = state;
    assert.equal(WorkspaceStartup({ children: 'app' }).props.children, 'app');
  }
});
