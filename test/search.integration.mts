import 'reflect-metadata';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

import { Pool } from 'pg';

Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'fatal',
  DATABASE_URL: 'postgresql://postgres:search-test@127.0.0.1:5438/search_test',
  VALKEY_URL: 'redis://127.0.0.1:6388/0',
  PUSH_ENABLED: 'false',
  PUSH_WORKER_ENABLED: 'false',
  DIGITAL_OCEAN_SPACES_ENDPOINT: 'https://spaces.test',
  DIGITAL_OCEAN_SPACES_BUCKET: 'search-test',
  DIGITAL_OCEAN_SPACES_ACCESS_KEY: 'test',
  DIGITAL_OCEAN_SPACES_SECRET_KEY: 'test',
  OIDC_ISSUER: '',
  OIDC_AUDIENCE: '',
  LIVEKIT_URL: '',
  LIVEKIT_API_KEY: '',
  LIVEKIT_API_SECRET: '',
});

// The compiled API retains Nest's DI and validation decorator metadata, unlike tsx.
const require = createRequire(import.meta.url);
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { AppModule } = require('../dist/app.module.js');
const { migrateDatabase } = require('../dist/database/drizzle/migrate-database.js');
const {
  AccountsTokenVerifier,
} = require('../dist/components/auth/accounts-token-verifier.service.js');
await migrateDatabase(process.env.DATABASE_URL);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false });
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
);
app.setGlobalPrefix('api');
app.get(AccountsTokenVerifier).verify = async (token: string) => ({
  sub: token,
  appId: 'search-test',
});
await app.init();
const http = app.getHttpAdapter().getInstance();
await http.ready();
const actor = `search-actor-${randomUUID()}`;
const peer = `search-peer-${randomUUID()}`;
const workspaces: string[] = [];

async function request(
  method: string,
  path: string,
  status = 200,
  token: string | null = actor,
  body?: object,
) {
  const response = await http.inject({
    method,
    url: `/api${path}`,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { payload: JSON.stringify(body) } : {}),
  });
  assert.equal(response.statusCode, status, `${method} ${path}: ${response.body}`);
  return response.body ? response.json() : undefined;
}

try {
  for (let index = 0; index < 2; index++) {
    const result = await pool.query(
      "insert into workspaces(name) values ('Search fixture') returning id",
    );
    workspaces.push(result.rows[0].id);
  }
  const members: string[] = [];
  for (const [user, name] of [
    [actor, 'Viewer'],
    [peer, 'Needle colleague'],
  ]) {
    const profile = await pool.query(
      'insert into user_profiles(oidc_user_id, display_name) values ($1, $2) returning id',
      [user, name],
    );
    const member = await pool.query(
      'insert into workspace_members(workspace_id, user_profile_id) values ($1, $2) returning id',
      [workspaces[0], profile.rows[0].id],
    );
    members.push(member.rows[0].id);
  }
  const channels: string[] = [];
  for (const name of ['Needle visible', 'Needle hidden']) {
    const result = await pool.query(
      "insert into channels(workspace_id, kind, name, created_by_member_id) values ($1, 'channel', $2, $3) returning id",
      [workspaces[0], name, members[1]],
    );
    channels.push(result.rows[0].id);
  }
  await pool.query(
    'insert into channel_memberships(workspace_id, channel_id, member_id) values ($1, $2, $3)',
    [workspaces[0], channels[0], members[0]],
  );
  await pool.query(
    "insert into channel_grants(workspace_id, channel_id, capability, principal, member_id) values ($1, $2, 'view', 'member', $3)",
    [workspaces[0], channels[0], members[0]],
  );
  const base = `/workspaces/${workspaces[0]}`;
  await request('GET', `${base}/search?q=Needle`, 401, null);
  await request('GET', `/workspaces/${workspaces[1]}/search?q=Needle`, 403);
  await request('GET', '/workspaces/not-an-id/search?q=Needle', 400);
  await request('GET', `${base}/search?q=${'x'.repeat(81)}`, 400);
  await request('GET', `${base}/search?q=one&q=two`, 400);
  assert.deepEqual(await request('GET', `${base}/search`), {
    channels: [],
    conversations: [],
    people: [],
  });
  const first = await request('GET', `${base}/search?q=%20needle%20`);
  assert.deepEqual(
    first.channels.map((item: { name: string }) => item.name),
    ['Needle visible'],
  );
  assert.equal(first.people[0].memberId, members[1]);
  assert.deepEqual(first.conversations, []);
  const [opened, duplicate] = await Promise.all([
    request('POST', `${base}/direct-messages`, 201, actor, { memberId: members[1] }),
    request('POST', `${base}/direct-messages`, 201, actor, { memberId: members[1] }),
  ]);
  assert.equal(opened.id, duplicate.id);
  const after = await request('GET', `${base}/search?q=Needle`);
  assert.deepEqual(after.people, []);
  assert.deepEqual(
    after.conversations.map((item: { id: string }) => item.id),
    [opened.id],
  );
  await pool.query('delete from channel_memberships where channel_id = $1 and member_id = $2', [
    channels[0],
    members[0],
  ]);
  assert.deepEqual((await request('GET', `${base}/search?q=Needle`)).channels, []);
  await pool.query("update workspace_members set status = 'removed' where id = $1", [members[0]]);
  await request('GET', `${base}/search?q=Needle`, 403);
  console.log(
    'PASS search HTTP: auth, workspace isolation, query validation, current view access, private names, DM reuse, deduplication and revocation',
  );
} finally {
  for (const id of workspaces) {
    await pool.query('delete from channels where workspace_id = $1', [id]);
    await pool.query('delete from workspaces where id = $1', [id]);
  }
  await pool.query('delete from user_profiles where oidc_user_id in ($1, $2)', [actor, peer]);
  await app.close();
  await pool.end();
}
