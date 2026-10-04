import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type { NativeAuthSession } from '../src/features/auth/api/native-auth-session';
import type { TokenSet } from '../src/features/auth/types';

const tokens: TokenSet = { accessToken: 'access', expiresAt: 1, idToken: 'id-token' };

function fixture(redirectUri = 'apchats://auth/callback') {
  let endpoint: string | undefined = 'https://accounts.example/oidc/session/end?existing=1';
  let result: { type: string; url?: string } = {
    type: 'success',
    url: `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}state=logout-state`,
  };
  const prompts: { url: URL; redirectUri: string; options: unknown }[] = [];
  const dependencies: Record<string, unknown> = {
    'expo-auth-session': {
      fetchDiscoveryAsync: async (issuer: string) => {
        assert.equal(issuer, 'https://accounts.example/oidc');
        return { endSessionEndpoint: endpoint };
      },
    },
    'expo-crypto': { randomUUID: () => 'logout-state' },
    'expo-web-browser': {
      openAuthSessionAsync: async (url: string, redirectUri: string, options: unknown) => {
        prompts.push({ url: new URL(url), redirectUri, options });
        return result;
      },
    },
  };
  const exports: {
    NativeAuthSession?: new (config: {
      issuer: string;
      clientId: string;
      audience: string;
      redirectUri: string;
    }) => NativeAuthSession;
  } = {};
  const source = ts.transpileModule(
    readFileSync(resolve(__dirname, '../src/features/auth/api/native-auth-session.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  runInNewContext(source, {
    exports,
    URL,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  assert.ok(exports.NativeAuthSession);
  const session = new exports.NativeAuthSession({
    issuer: 'https://accounts.example/oidc',
    clientId: 'native-client',
    audience: 'chats',
    redirectUri,
  });
  return {
    session,
    prompts,
    setEndpoint: (value: string | undefined) => {
      endpoint = value;
    },
    setResult: (value: typeof result) => {
      result = value;
    },
  };
}

test('native logout uses discovery, ID-token hint, registered redirect and shared browser cookies', async () => {
  const f = fixture();
  await f.session.signOut(tokens.idToken);
  assert.equal(f.prompts.length, 1);
  const prompt = f.prompts[0];
  assert.equal(prompt.url.origin, 'https://accounts.example');
  assert.equal(prompt.url.pathname, '/oidc/session/end');
  assert.equal(prompt.url.searchParams.get('existing'), '1');
  assert.equal(prompt.url.searchParams.get('client_id'), 'native-client');
  assert.equal(prompt.url.searchParams.get('id_token_hint'), 'id-token');
  assert.equal(prompt.url.searchParams.get('post_logout_redirect_uri'), 'apchats://auth/callback');
  assert.equal(prompt.url.searchParams.get('state'), 'logout-state');
  assert.equal(prompt.redirectUri, 'apchats://auth/callback');
  assert.equal(prompt.options, undefined);
  assert.equal(prompt.url.searchParams.has('access_token'), false);
});

test('logout without an ID token still identifies the native client', async () => {
  const f = fixture();
  await f.session.signOut();
  assert.equal(f.prompts[0].url.searchParams.get('client_id'), 'native-client');
  assert.equal(f.prompts[0].url.searchParams.has('id_token_hint'), false);
});

test('a provider without end_session_endpoint cannot falsely report successful logout', async () => {
  const f = fixture();
  f.setEndpoint(undefined);
  await assert.rejects(f.session.signOut(tokens.idToken), /end_session_endpoint/);
  assert.equal(f.prompts.length, 0);
});

test('cancelled, dismissed and locked browser sessions are not successful logout', async () => {
  for (const type of ['cancel', 'dismiss', 'locked']) {
    const f = fixture();
    f.setResult({ type });
    await assert.rejects(f.session.signOut(tokens.idToken), new RegExp(`Sign-out ${type}`));
  }
});

test('logout rejects missing or mismatched state and unrelated callback routes', async () => {
  for (const url of [
    'apchats://auth/callback',
    'apchats://auth/callback?state=wrong',
    'apchats://auth/other?state=logout-state',
    'apchats://other/callback?state=logout-state',
    'other://auth/callback?state=logout-state',
  ]) {
    const f = fixture();
    f.setResult({ type: 'success', url });
    await assert.rejects(f.session.signOut(tokens.idToken), /Invalid sign-out callback/);
  }
});

test('Accounts callback errors do not falsely complete logout', async () => {
  const f = fixture();
  f.setResult({
    type: 'success',
    url: 'apchats://auth/callback?state=logout-state&error=invalid_request',
  });
  await assert.rejects(f.session.signOut(tokens.idToken), /could not complete sign-out/);
});

test('Expo Go redirects retain their path and registered query parameters', async () => {
  const f = fixture('exp://192.168.1.10:8081/--/auth/callback?environment=dev');
  await f.session.signOut(tokens.idToken);
  f.setResult({
    type: 'success',
    url: 'exp://192.168.1.10:8081/--/auth/callback?state=logout-state',
  });
  await assert.rejects(f.session.signOut(tokens.idToken), /Invalid sign-out callback/);
});
