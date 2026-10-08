import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type * as PushApi from '../src/features/notifications/api/push-api';
import { jsonInit } from '../src/shared/api/http';

function pushApi() {
  const requests: { url: string; init: RequestInit }[] = [];
  const api = {} as typeof PushApi;
  const source = ts.transpileModule(
    readFileSync(new URL('../src/features/notifications/api/push-api.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;

  runInNewContext(source, {
    exports: api,
    AbortSignal,
    localStorage: { getItem: () => 'installation' },
    require: () => ({
      jsonInit,
      apiRequest: async (url: string, _token: string, init: RequestInit) => {
        requests.push({ url, init });
        return { id: 'subscription' };
      },
    }),
  });

  return {
    api,
    body: (index: number) => JSON.parse(requests[index]!.init.body as string),
    requests,
  };
}

// The API rejects unknown fields, so the browser's expirationTime must never reach it.
test('registration sends only the endpoint, keys and installation', async () => {
  const { api, body } = pushApi();
  const keys = { p256dh: 'public-key', auth: 'auth-key' };

  await api.registerSubscription('token', {
    toJSON: () => ({ endpoint: 'https://push.test/1', expirationTime: 1800000000000, keys }),
  } as unknown as PushSubscription);

  assert.deepEqual(body(0), {
    endpoint: 'https://push.test/1',
    keys,
    installationId: 'installation',
  });
});
