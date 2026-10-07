import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

import type {
  registerSubscription,
  updatePresence,
} from '../src/features/notifications/api/push-api';
import { jsonInit } from '../src/shared/api/http';

const installationId = '6195ac98-4010-4344-92b9-d39a55d96937';

function fixture() {
  const requests: { url: string; token: string; init: RequestInit }[] = [];
  const exports = {} as {
    registerSubscription: typeof registerSubscription;
    updatePresence: typeof updatePresence;
  };
  const source = ts.transpileModule(
    readFileSync(new URL('../src/features/notifications/api/push-api.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  runInNewContext(source, {
    exports,
    AbortSignal,
    localStorage: { getItem: () => installationId },
    require: (name: string) => {
      assert.equal(name, '@/shared/api/http');
      return {
        jsonInit,
        apiRequest: async (url: string, token: string, init: RequestInit) => {
          requests.push({ url, token, init });
          return { id: 'subscription' };
        },
      };
    },
  });
  return { api: exports, requests };
}

for (const expirationTime of [null, 1800000000000]) {
  test(`push registration excludes browser expirationTime (${expirationTime}) from the API payload`, async () => {
    const { api, requests } = fixture();
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test-subscription';
    const keys = { p256dh: 'public-key', auth: 'auth-key' };

    await api.registerSubscription('account-token', {
      toJSON: () => ({ endpoint, expirationTime, keys }),
    } as unknown as PushSubscription);

    assert.equal(requests.length, 1);
    assert.equal(requests[0]!.url, '/api/devices/web');
    assert.equal(requests[0]!.token, 'account-token');
    assert.equal(requests[0]!.init.method, 'POST');
    assert.deepEqual(JSON.parse(requests[0]!.init.body as string), {
      endpoint,
      keys,
      installationId,
    });
  });
}

test('clearing foreground presence sends an authenticated keepalive request that can survive page closure', async () => {
  const { api, requests } = fixture();
  await api.updatePresence('account-token', 'subscription', { focused: false });
  assert.equal(requests.length, 1);
  assert.equal(requests[0]!.url, '/api/devices/web/subscription/presence');
  assert.equal(requests[0]!.token, 'account-token');
  assert.equal(requests[0]!.init.method, 'PATCH');
  assert.equal(requests[0]!.init.keepalive, true);
  assert.deepEqual(JSON.parse(requests[0]!.init.body as string), { focused: false });
});
