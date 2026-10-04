import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AuthSessionProvider, TokenSet, TokenStore } from '../types';
import { createAuthStore } from './auth-store';

const tokens: TokenSet = {
  accessToken: 'access',
  idToken: 'identity',
  expiresAt: Date.now() + 3_600_000,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

async function flush() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

function fixture(configured = true) {
  let persisted: TokenSet | null = tokens;
  const operations: string[] = [];
  const session: AuthSessionProvider = {
    signIn: async () => tokens,
    refresh: async () => ({ ...tokens, accessToken: 'renewed' }),
    signOut: async (hint) => {
      operations.push('logout');
      assert.equal(hint, tokens.idToken);
    },
  };
  const persistence: TokenStore = {
    load: async () => persisted,
    save: async (value) => {
      operations.push('save');
      persisted = value;
    },
    clear: async () => {
      operations.push('clear');
      persisted = null;
    },
  };
  const store = createAuthStore(session, persistence, configured);
  return { store, session, persistence, operations, persisted: () => persisted };
}

test('logout immediately hides authenticated content, clears persistence, then ends Accounts session', async () => {
  const f = fixture();
  await f.store.getState().restore();
  const browser = deferred<void>();
  f.session.signOut = async (hint) => {
    assert.equal(hint, tokens.idToken);
    assert.equal(f.persisted(), null);
    f.operations.push('logout');
    await browser.promise;
  };
  const logout = f.store.getState().signOut();
  assert.equal(f.store.getState().status, 'signing-out');
  assert.equal('tokens' in f.store.getState(), false);
  await flush();
  assert.deepEqual(f.operations, ['clear', 'logout']);
  browser.resolve();
  await logout;
  assert.equal(f.store.getState().status, 'signed-out');
});

test('double logout opens one browser and sign-in cannot compete with it', async () => {
  const f = fixture();
  await f.store.getState().restore();
  const browser = deferred<void>();
  let prompts = 0;
  f.session.signOut = async () => {
    prompts++;
    await browser.promise;
  };
  f.session.signIn = async () => {
    assert.fail('Sign-in must wait for logout');
  };
  const first = f.store.getState().signOut();
  const second = f.store.getState().signOut();
  await f.store.getState().signIn();
  await flush();
  assert.equal(prompts, 1);
  browser.resolve();
  await Promise.all([first, second]);
});

test('browser cancellation clears credentials and retains the ID-token hint for retry', async () => {
  const f = fixture();
  await f.store.getState().restore();
  f.session.signOut = async (hint) => {
    assert.equal(hint, tokens.idToken);
    throw new Error('Sign-out cancel');
  };
  await f.store.getState().signOut();
  const state = f.store.getState();
  assert.equal(state.status, 'error');
  assert.equal(state.status === 'error' && state.operation, 'sign-out');
  assert.equal('tokens' in state, false);
  assert.equal(f.persisted(), null);
  f.session.signOut = async (hint) => {
    assert.equal(hint, tokens.idToken);
  };
  await f.store.getState().signOut();
  assert.equal(f.store.getState().status, 'signed-out');
});

test('a refresh response arriving after logout cannot restore tokens or signed-in state', async () => {
  const f = fixture();
  await f.store.getState().restore();
  const response = deferred<TokenSet>();
  f.session.refresh = () => response.promise;
  const refresh = f.store.getState().refreshNow();
  await f.store.getState().signOut();
  response.resolve({ ...tokens, accessToken: 'late' });
  await refresh;
  assert.equal(f.persisted(), null);
  assert.equal(f.store.getState().status, 'signed-out');
  assert.deepEqual(f.operations, ['clear', 'logout']);
});

test('a refresh save already running completes before the final logout clear', async () => {
  const f = fixture();
  await f.store.getState().restore();
  const saved = deferred<void>();
  const save = f.persistence.save;
  f.persistence.save = async (value) => {
    await saved.promise;
    await save(value);
  };
  const refresh = f.store.getState().refreshNow();
  await flush();
  const logout = f.store.getState().signOut();
  saved.resolve();
  await Promise.all([refresh, logout]);
  assert.deepEqual(f.operations, ['save', 'clear', 'logout']);
  assert.equal(f.persisted(), null);
  assert.equal(f.store.getState().status, 'signed-out');
});

test('old refresh failures cannot clear a new signed-in session', async () => {
  const f = fixture();
  await f.store.getState().restore();
  const response = deferred<TokenSet>();
  f.session.refresh = () => response.promise;
  const refresh = f.store.getState().refreshNow();
  await f.store.getState().signOut();
  await f.store.getState().signIn();
  response.reject(new Error('Revoked old token'));
  await refresh;
  assert.equal(f.persisted(), tokens);
  assert.equal(f.store.getState().status, 'signed-in');
  assert.deepEqual(f.operations, ['clear', 'logout', 'save']);
});

test('pending restore and sign-in results cannot resurrect a logged-out session', async () => {
  for (const operation of ['restore', 'signIn'] as const) {
    const f = fixture();
    const response = deferred<TokenSet>();
    f.persistence.load = () => response.promise;
    f.session.signIn = () => response.promise;
    f.session.signOut = async () => {};
    const pending = f.store.getState()[operation]();
    await f.store.getState().signOut();
    response.resolve(tokens);
    await pending;
    assert.equal(f.store.getState().status, 'signed-out');
    assert.equal(f.persisted(), null);
  }
});

test('parallel bridge refresh requests share one refresh operation', async () => {
  const f = fixture();
  await f.store.getState().restore();
  const response = deferred<TokenSet>();
  let requests = 0;
  f.session.refresh = () => {
    requests++;
    return response.promise;
  };
  const first = f.store.getState().refreshNow();
  const second = f.store.getState().refreshNow();
  assert.equal(requests, 1);
  response.resolve(tokens);
  await Promise.all([first, second]);
  assert.deepEqual(f.operations, ['save']);
});

test('logout cancels scheduled token refresh', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture();
  f.persistence.load = async () => ({ ...tokens, refreshToken: 'refresh' });
  f.session.signOut = async () => {};
  f.session.refresh = async () => {
    assert.fail('Timer must be cancelled');
  };
  await f.store.getState().restore();
  await f.store.getState().signOut();
  context.mock.timers.tick(3_600_000);
  assert.equal(f.store.getState().status, 'signed-out');
});

test('a persistence clear failure is retryable and never reported as successful logout', async () => {
  const f = fixture();
  await f.store.getState().restore();
  const clear = f.persistence.clear;
  f.persistence.clear = async () => {
    throw new Error('SecureStore unavailable');
  };
  await f.store.getState().signOut();
  assert.equal(f.store.getState().status, 'error');
  assert.equal(f.persisted(), tokens);
  f.persistence.clear = clear;
  await f.store.getState().signOut();
  assert.equal(f.persisted(), null);
  assert.equal(f.store.getState().status, 'signed-out');
});

test('unconfigured clients do not attempt logout or clear persistence', async () => {
  const f = fixture(false);
  await f.store.getState().signOut();
  assert.equal(f.store.getState().status, 'unconfigured');
  assert.deepEqual(f.operations, []);
});
