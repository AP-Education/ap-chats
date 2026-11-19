import assert from 'node:assert/strict';
import { test } from 'node:test';

import { adminApi, AdminApiError } from './admin-api';

function recorder(status: number, body: string) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fake: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(body || null, { status });
  };
  return { calls, fake };
}

test('calls the admin API with the bearer token', async () => {
  const { calls, fake } = recorder(201, '{"id":"u1"}');
  const api = adminApi({ apiUrl: 'https://chats.example.com/', token: 't0ken', fetch: fake });

  const result = await api.publish({
    platform: 'ios',
    channel: 'preview',
    runtimeVersion: 'r1',
    manifest: {},
  });

  assert.deepEqual(result, { id: 'u1' });
  assert.equal(calls[0]?.url, 'https://chats.example.com/api/updates/admin/releases');
  assert.equal(calls[0]?.init.method, 'POST');
  assert.equal((calls[0]?.init.headers as Record<string, string>).authorization, 'Bearer t0ken');
});

test('lists by channel and platform, and takes an empty answer', async () => {
  const listing = recorder(200, '[]');
  await adminApi({ apiUrl: 'https://a.example.com', token: 't', fetch: listing.fake }).list(
    'production',
    'android',
  );
  assert.equal(
    listing.calls[0]?.url,
    'https://a.example.com/api/updates/admin/releases?channel=production&platform=android',
  );

  const pause = recorder(204, '');
  const api = adminApi({ apiUrl: 'https://a.example.com', token: 't', fetch: pause.fake });
  assert.equal(await api.pause('u1'), undefined);
});

test('turns a refusal into an error that says why', async () => {
  const conflict = recorder(
    409,
    '{"statusCode":409,"message":"No store build ships this runtime"}',
  );
  const api = adminApi({ apiUrl: 'https://a.example.com', token: 't', fetch: conflict.fake });
  await assert.rejects(api.setRollout('u1', 50), (error: unknown) => {
    assert.ok(error instanceof AdminApiError);
    assert.equal(error.status, 409);
    assert.equal(error.message, 'The API answered 409: No store build ships this runtime');
    return true;
  });

  const denied = recorder(401, '{"message":"Unauthorized"}');
  await assert.rejects(
    adminApi({ apiUrl: 'https://a.example.com', token: 't', fetch: denied.fake }).pause('u1'),
    { message: 'The API refused the admin token: check UPDATES_ADMIN_TOKEN' },
  );
});

test('never sends the admin token over plain HTTP to another host', () => {
  const { fake } = recorder(200, '[]');
  assert.throws(
    () => adminApi({ apiUrl: 'http://chats.example.com', token: 't', fetch: fake }),
    /must use https/u,
  );
  assert.doesNotThrow(() => adminApi({ apiUrl: 'http://localhost:3211', token: 't', fetch: fake }));
});
