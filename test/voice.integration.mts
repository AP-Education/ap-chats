import 'reflect-metadata';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

import { Pool } from 'pg';
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';

Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'fatal',
  DATABASE_URL: 'postgresql://postgres:voice-test@127.0.0.1:5439/voice_test',
  VALKEY_URL: 'redis://127.0.0.1:6389/0',
  PUSH_ENABLED: 'false',
  PUSH_WORKER_ENABLED: 'false',
  DIGITAL_OCEAN_SPACES_ENDPOINT: 'http://127.0.0.1:9019',
  DIGITAL_OCEAN_SPACES_BUCKET: 'voice-test',
  DIGITAL_OCEAN_SPACES_ACCESS_KEY: 'voice-test',
  DIGITAL_OCEAN_SPACES_SECRET_KEY: 'voice-test-secret',
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
  appId: 'voice-test',
});
await app.init();
const http = app.getHttpAdapter().getInstance();
await http.ready();
const actor = `voice-actor-${randomUUID()}`;
const peer = `voice-peer-${randomUUID()}`;
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

const s3 = new S3Client({
  endpoint: 'http://127.0.0.1:9019',
  region: '127',
  forcePathStyle: true,
  credentials: { accessKeyId: 'voice-test', secretAccessKey: 'voice-test-secret' },
});
try {
  await s3.send(new CreateBucketCommand({ Bucket: 'voice-test' }));
} catch (error) {
  if (!['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes((error as Error).name))
    throw error;
}
try {
  const result = await pool.query(
    "insert into workspaces(name) values ('Voice fixture') returning id",
  );
  const workspace = result.rows[0].id;
  workspaces.push(workspace);
  const members = [];
  for (const user of [actor, peer]) {
    const profile = await pool.query(
      'insert into user_profiles(oidc_user_id, display_name) values ($1,$1) returning id',
      [user],
    );
    const member = await pool.query(
      'insert into workspace_members(workspace_id,user_profile_id) values ($1,$2) returning id',
      [workspace, profile.rows[0].id],
    );
    members.push(member.rows[0].id);
  }
  const channels = [];
  for (const name of ['voice-channel', 'forward-target']) {
    const channel = await pool.query(
      "insert into channels(workspace_id,kind,name,created_by_member_id) values ($1,'channel',$2,$3) returning id",
      [workspace, name, members[0]],
    );
    channels.push(channel.rows[0].id);
    for (const member of members) {
      await pool.query(
        'insert into channel_memberships(workspace_id,channel_id,member_id) values ($1,$2,$3)',
        [workspace, channel.rows[0].id, member],
      );
      await pool.query(
        "insert into channel_grants(workspace_id,channel_id,capability,principal,member_id) values ($1,$2,'post','member',$3)",
        [workspace, channel.rows[0].id, member],
      );
    }
  }
  const base = `/workspaces/${workspace}/channels/${channels[0]}`;
  async function put(bytes: Buffer, name: string, uploadBase = base) {
    const session = await request('POST', `${uploadBase}/uploads`, 201, actor, {
      name,
      size: bytes.length,
    });
    const part = await request('POST', `${uploadBase}/uploads/${session.id}/part`, 201, actor, {
      number: 1,
    });
    const response = await fetch(part.url, { method: 'PUT', body: bytes });
    assert.equal(response.status, 200, await response.text());
    return session.id;
  }
  const bytes = await readFile(new URL('./fixtures/voice-tone.m4a', import.meta.url));
  const id = await put(bytes, 'voice.m4a');
  await request('POST', `${base}/uploads/${id}/complete`, 404, peer, { kind: 'voice' });
  await request('POST', `${base}/uploads/${id}/complete`, 400, actor, {
    kind: 'voice',
    durationMs: 1,
  });
  const metadata = await request('POST', `${base}/uploads/${id}/complete`, 201, actor, {
    kind: 'voice',
  });
  assert.equal(metadata.preview, 'audio');
  assert.equal(metadata.mediaType, 'audio/mp4');
  assert.ok(metadata.voice.durationMs >= 1000 && metadata.voice.durationMs < 2500);
  assert.deepEqual(
    await request('POST', `${base}/uploads/${id}/complete`, 201, actor, { kind: 'voice' }),
    metadata,
  );
  const input = { markdown: '', clientNonce: randomUUID(), attachments: [{ id }] };
  const message = await request('POST', `${base}/messages`, 201, actor, input);
  assert.deepEqual(message.attachments[0].voice, metadata.voice);
  assert.equal((await request('POST', `${base}/messages`, 201, actor, input)).id, message.id);
  const reply = await request('POST', `${base}/messages`, 201, actor, {
    markdown: 'reply',
    clientNonce: randomUUID(),
    replyToMessageId: message.id,
  });
  assert.ok(reply.id);
  const replyEntry = await request('GET', `${base}/messages/${reply.id}`);
  assert.deepEqual(replyEntry.reply.attachments[0].voice, metadata.voice);
  const dm = await request('POST', `/workspaces/${workspace}/direct-messages`, 201, actor, {
    memberId: members[1],
  });
  const dmBase = `/workspaces/${workspace}/channels/${dm.id}`;
  const dmUpload = await put(bytes, 'direct-voice.m4a', dmBase);
  const dmMetadata = await request('POST', `${dmBase}/uploads/${dmUpload}/complete`, 201, actor, {
    kind: 'voice',
  });
  const dmMessage = await request('POST', `${dmBase}/messages`, 201, actor, {
    markdown: '',
    clientNonce: randomUUID(),
    attachments: [{ id: dmUpload }],
  });
  assert.deepEqual(dmMessage.attachments[0].voice, dmMetadata.voice);
  const inbox = await request('GET', `/direct-messages/${dm.id}`, 200, peer);
  assert.deepEqual(inbox.lastMessage.attachments[0].voice, dmMetadata.voice);

  const url = await request(
    'GET',
    `${base}/uploads/${id}/messages/${message.id}/url?variant=preview`,
  );
  const audio = await fetch(url.url);
  assert.equal(audio.status, 200);
  assert.equal(audio.headers.get('content-type'), 'audio/mp4');
  assert.deepEqual(Buffer.from(await audio.arrayBuffer()), bytes);
  const forwarded = await request('POST', `/workspaces/${workspace}/messages/forward`, 201, actor, {
    sourceChannelId: channels[0],
    target: { kind: 'channel', id: channels[1] },
    batchNonce: randomUUID(),
    messageIds: [message.id],
  });
  assert.deepEqual(forwarded.messages[0].attachments[0].voice, metadata.voice);
  const bad = await put(Buffer.from('%PDF-1.7 fake audio'), 'voice.m4a');
  await request('POST', `${base}/uploads/${bad}/complete`, 400, actor, { kind: 'voice' });
  await request('DELETE', `${base}/uploads/${bad}`, 204);
  const normal = await put(bytes, 'regular.m4a');
  await request('POST', `${base}/uploads/${normal}/complete`, 201, actor, {});
  await request('POST', `${base}/uploads/${normal}/complete`, 400, actor, { kind: 'voice' });
  const revoked = await put(bytes, 'revoked.m4a');
  await pool.query('delete from channel_grants where channel_id=$1 and member_id=$2', [
    channels[0],
    members[0],
  ]);
  await request('POST', `${base}/uploads/${revoked}/complete`, 403, actor, { kind: 'voice' });
  await pool.query('delete from channel_memberships where channel_id=$1 and member_id=$2', [
    channels[0],
    members[0],
  ]);
  await request('GET', `${base}/uploads/${id}/messages/${message.id}/url?variant=preview`, 404);
  console.log(
    'PASS: real PostgreSQL/S3 voice upload, content inspection, owner/post/view guards, idempotent completion/posting, forwarding, readable audio, regular-file immutability and spoof rejection',
  );
} finally {
  for (const workspace of workspaces) {
    await pool.query('delete from channels where workspace_id=$1', [workspace]);
    await pool.query('delete from workspaces where id=$1', [workspace]);
  }
  await pool.query('delete from user_profiles where oidc_user_id in ($1,$2)', [actor, peer]);
  await app.close();
  await pool.end();
  s3.destroy();
}
