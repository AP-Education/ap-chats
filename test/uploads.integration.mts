import 'reflect-metadata';

import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import type { Type } from '@nestjs/common';
import { Pool } from 'pg';
import sharp from 'sharp';

Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'fatal',
  PUSH_ENABLED: 'false',
  PUSH_WORKER_ENABLED: 'false',
  VALKEY_URL: 'redis://127.0.0.1:6387/0',
  DATABASE_URL: 'postgresql://postgres:uploads-test@127.0.0.1:5437/uploads_test',
  DIGITAL_OCEAN_SPACES_ENDPOINT: 'http://127.0.0.1:9017',
  DIGITAL_OCEAN_SPACES_BUCKET: 'uploads-test',
  DIGITAL_OCEAN_SPACES_ACCESS_KEY: 'uploads-test',
  DIGITAL_OCEAN_SPACES_SECRET_KEY: 'uploads-test-secret',
  OIDC_ISSUER: '',
  OIDC_AUDIENCE: '',
  LIVEKIT_URL: '',
  LIVEKIT_API_KEY: '',
  LIVEKIT_API_SECRET: '',
});
// Boots the compiled dist, not src, via a dynamic require: NestJS DI and
// class-validator both read `design:paramtypes`/`design:type` decorator
// metadata, which only tsc emits — esbuild-based tsx, used for every other
// test in this repo, does not — so this one black-box test needs the real
// tsc build output rather than a transpile-only run against src.
const require = createRequire(import.meta.url);
// Nest itself is required too: an ESM import would load a second copy of @nestjs/core beside the
// one dist requires, and its injector then fails to resolve its own ApplicationConfig.
const { ServiceUnavailableException, ValidationPipe } =
  require('@nestjs/common') as typeof import('@nestjs/common');
const { NestFactory } = require('@nestjs/core') as typeof import('@nestjs/core');
const { FastifyAdapter } =
  require('@nestjs/platform-fastify') as typeof import('@nestjs/platform-fastify');
const { AppModule } = require('../dist/app.module.js') as { AppModule: Type };
const { migrateDatabase } = require('../dist/database/drizzle/migrate-database.js') as {
  migrateDatabase: (connectionString: string) => Promise<void>;
};
const { AccountsTokenVerifier } =
  require('../dist/components/auth/accounts-token-verifier.service.js') as {
    AccountsTokenVerifier: Type<{
      verify: (token: string) => Promise<{ sub: string; appId: string }>;
    }>;
  };
const { UploadCleanupService } =
  require('../dist/components/social/attachments/upload-cleanup.service.js') as {
    UploadCleanupService: Type<{ sweep: () => Promise<void> }>;
  };
const { AttachmentPreviewService } =
  require('../dist/components/social/attachments/attachment-preview.service.js') as {
    AttachmentPreviewService: Type<{ inspect: (...args: unknown[]) => Promise<unknown> }>;
  };
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({
  endpoint: 'http://127.0.0.1:9017',
  region: '127',
  forcePathStyle: true,
  credentials: { accessKeyId: 'uploads-test', secretAccessKey: 'uploads-test-secret' },
});
try {
  await s3.send(new CreateBucketCommand({ Bucket: 'uploads-test' }));
} catch (error) {
  const name = error instanceof Error ? error.name : undefined;
  if (!name || !['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(name)) throw error;
}
await migrateDatabase(process.env.DATABASE_URL!);
const app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false });
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
);
app.setGlobalPrefix('api');
app.get(AccountsTokenVerifier).verify = async (token: string) => ({
  sub: token,
  appId: 'upload-test',
});
await app.init();
const fastify = app.getHttpAdapter().getInstance();
await fastify.ready();
let workspaceId: string | undefined;
const actor = `upload-test-owner-${randomUUID()}`;
const outsider = `upload-test-outsider-${randomUUID()}`;
const viewer = `upload-test-viewer-${randomUUID()}`;
async function request(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  expected = 200,
  token = actor,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- black-box HTTP responses, shaped ad hoc per call site
): Promise<any> {
  const response = await fastify.inject({
    method,
    url: `/api${path}`,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
  });
  assert.equal(response.statusCode, expected, `${method} ${path}: ${response.body}`);
  return response.body ? response.json() : undefined;
}
try {
  const workspace = await pool.query(
    "insert into workspaces(name) values ('Upload tests') returning id",
  );
  workspaceId = workspace.rows[0].id;
  const members = [];
  for (const user of [actor, outsider, viewer]) {
    const profile = await pool.query(
      'insert into user_profiles(oidc_user_id, display_name) values ($1, $2) returning id',
      [user, user],
    );
    const member = await pool.query(
      'insert into workspace_members(workspace_id, user_profile_id, access_level) values ($1, $2, $3) returning id',
      [workspaceId, profile.rows[0].id, user === actor ? 'owner' : 'member'],
    );
    members.push(member.rows[0].id);
  }
  const channelIds = [];
  for (const name of ['uploads-source', 'uploads-forward']) {
    const result = await pool.query(
      "insert into channels(workspace_id, kind, name, created_by_member_id) values ($1, 'channel', $2, $3) returning id",
      [workspaceId, name, members[0]],
    );
    const id = result.rows[0].id;
    channelIds.push(id);
    await pool.query(
      'insert into channel_memberships(workspace_id, channel_id, member_id) values ($1, $2, $3)',
      [workspaceId, id, members[0]],
    );
    await pool.query(
      "insert into channel_grants(workspace_id, channel_id, capability, principal, member_id) values ($1, $2, 'manage', 'member', $3)",
      [workspaceId, id, members[0]],
    );
  }
  const source = `/workspaces/${workspaceId}/channels/${channelIds[0]}`;
  const target = `/workspaces/${workspaceId}/channels/${channelIds[1]}`;
  await pool.query(
    'insert into channel_memberships(workspace_id, channel_id, member_id) values ($1, $2, $3)',
    [workspaceId, channelIds[0], members[2]],
  );
  await pool.query(
    "insert into channel_grants(workspace_id, channel_id, capability, principal, member_id) values ($1, $2, 'view', 'member', $3)",
    [workspaceId, channelIds[0], members[2]],
  );
  const policy = await request('GET', `${source}/uploads/policy`);
  assert.equal(policy.maxFileBytes, 1_000_000_000);
  await request('POST', `${source}/uploads`, { name: 'too-big.zip', size: 1_000_000_001 }, 400);
  await request('POST', `${source}/uploads`, { name: 'empty.txt', size: 0 }, 400);
  await request('POST', `${source}/uploads`, { name: 'private.txt', size: 10 }, 404, outsider);
  await request('POST', `${source}/uploads`, { name: 'view-only.txt', size: 10 }, 403, viewer);
  const boundary = await request(
    'POST',
    `${source}/uploads`,
    { name: '1GB.zip', size: 1_000_000_000 },
    201,
  );
  await request('DELETE', `${source}/uploads/${boundary.id}`, undefined, 204);

  const size = process.argv.includes('--large') ? 1_000_000_000 : policy.partBytes + 37;
  const session = await request('POST', `${source}/uploads`, { name: 'large.zip', size }, 201);
  await request('POST', `${source}/uploads/${session.id}/complete`, {}, 400);
  const chunk = Buffer.alloc(64 * 1024, 0x41);
  let peak = process.memoryUsage().rss;
  const initialMemory = peak;
  for (let number = 1; number <= Math.ceil(size / policy.partBytes); number++) {
    const bytes = Math.min(policy.partBytes, size - (number - 1) * policy.partBytes);
    const { url } = await request('POST', `${source}/uploads/${session.id}/part`, { number }, 201);
    assert.ok(new URL(url).searchParams.get('X-Amz-SignedHeaders').includes('content-length'));
    const body = Readable.from(
      (function* () {
        for (let offset = 0; offset < bytes; offset += chunk.length)
          yield chunk.subarray(0, Math.min(chunk.length, bytes - offset));
      })(),
    );
    const upload = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Length': String(bytes) },
      body,
      duplex: 'half',
    });
    assert.equal(upload.status, 200, await upload.text());
    peak = Math.max(peak, process.memoryUsage().rss);
  }
  const attachment = await request('POST', `${source}/uploads/${session.id}/complete`, {}, 201);
  assert.equal(attachment.size, size);
  assert.equal(attachment.preview, null);
  assert.deepEqual(
    await request('POST', `${source}/uploads/${session.id}/complete`, {}, 201),
    attachment,
  );
  await request('POST', `${source}/uploads/${session.id}/part`, { number: 1 }, 409);
  const nonce = randomUUID();
  const payload = { markdown: '', clientNonce: nonce, attachments: [{ id: attachment.id }] };
  const message = await request('POST', `${source}/messages`, payload, 201);
  assert.equal(message.attachments[0].id, attachment.id);
  assert.equal((await request('POST', `${source}/messages`, payload, 201)).id, message.id);
  await request('POST', `${source}/messages`, { ...payload, markdown: 'changed' }, 409);
  await request('POST', `${source}/messages`, { ...payload, clientNonce: randomUUID() }, 409);
  await request(
    'GET',
    `${source}/uploads/${attachment.id}/messages/${message.id}/url`,
    undefined,
    404,
    outsider,
  );
  const access = await request(
    'GET',
    `${source}/uploads/${attachment.id}/messages/${message.id}/url`,
  );
  const anonymous = new URL(access.url);
  anonymous.search = '';
  const unauthorized = await fetch(anonymous);
  assert.equal(unauthorized.status, 403);
  await unauthorized.body?.cancel();
  const range = await fetch(access.url, { headers: { Range: 'bytes=0-63' } });
  assert.equal(range.status, 206);
  assert.equal((await range.arrayBuffer()).byteLength, 64);
  assert.match(range.headers.get('content-disposition'), /^attachment;/);
  const forwarded = await request(
    'POST',
    `/workspaces/${workspaceId}/messages/forward`,
    {
      sourceChannelId: channelIds[0],
      target: { kind: 'channel', id: channelIds[1] },
      batchNonce: randomUUID(),
      messageIds: [message.id],
    },
    201,
  );
  assert.equal(forwarded.messages[0].attachments[0].id, attachment.id);
  await request('DELETE', `${source}/messages/${message.id}`, undefined, 204);
  await request(
    'GET',
    `${source}/uploads/${attachment.id}/messages/${message.id}/url`,
    undefined,
    404,
  );
  await pool.query(
    "update chat_uploads set expires_at = now() - interval '1 minute' where id = $1",
    [attachment.id],
  );
  await app.get(UploadCleanupService).sweep();
  await request(
    'GET',
    `${target}/uploads/${attachment.id}/messages/${forwarded.messages[0].id}/url`,
  );

  const png = await sharp({
    create: { width: 640, height: 400, channels: 3, background: '#0c7d77' },
  })
    .png()
    .toBuffer();
  const imageSession = await request(
    'POST',
    `${target}/uploads`,
    { name: 'image.png', size: png.length },
    201,
  );
  const imagePart = await request(
    'POST',
    `${target}/uploads/${imageSession.id}/part`,
    { number: 1 },
    201,
  );
  const tampered = await fetch(imagePart.url, { method: 'PUT', body: png.subarray(0, -1) });
  assert.equal(tampered.status, 403);
  await tampered.body?.cancel();
  assert.equal((await fetch(imagePart.url, { method: 'PUT', body: png })).status, 200);
  const previews = app.get(AttachmentPreviewService);
  const inspect = previews.inspect.bind(previews);
  let releasePreview;
  let enteredPreview;
  const held = new Promise((resolve) => {
    releasePreview = resolve;
  });
  const entered = new Promise((resolve) => {
    enteredPreview = resolve;
  });
  previews.inspect = async () => {
    enteredPreview();
    await held;
    throw new ServiceUnavailableException('Simulated thumbnail worker interruption');
  };
  const interrupted = request('POST', `${target}/uploads/${imageSession.id}/complete`, {}, 503);
  await entered;
  await request('POST', `${target}/uploads/${imageSession.id}/complete`, {}, 409);
  const textInput = {
    markdown: 'Channel posting continues during preview',
    clientNonce: randomUUID(),
  };
  const textMessage = await request('POST', `${target}/messages`, textInput, 201);
  const legacyDigest = createHash('sha256')
    .update(JSON.stringify({ markdown: textInput.markdown, reply: null, quote: null }))
    .digest('hex');
  await pool.query('update chat_messages set request_digest = $1 where id = $2', [
    legacyDigest,
    textMessage.id,
  ]);
  assert.equal((await request('POST', `${target}/messages`, textInput, 201)).id, textMessage.id);
  releasePreview();
  await interrupted;
  previews.inspect = inspect;
  const image = await request('POST', `${target}/uploads/${imageSession.id}/complete`, {}, 201);
  assert.equal(image.preview, 'image');
  const imageMessage = await request(
    'POST',
    `${target}/messages`,
    {
      markdown: '',
      clientNonce: randomUUID(),
      attachments: [{ id: image.id, description: 'Командний план' }],
    },
    201,
  );
  const thumbnail = await request(
    'GET',
    `${target}/uploads/${image.id}/messages/${imageMessage.id}/url?variant=thumbnail`,
  );
  const thumbnailResponse = await fetch(thumbnail.url);
  assert.equal(thumbnailResponse.headers.get('content-type'), 'image/webp');
  assert.equal(
    (await sharp(Buffer.from(await thumbnailResponse.arrayBuffer())).metadata()).width,
    640,
  );

  const video = await readFile(
    new URL('../web/tests/media/public/media/sample.mp4', import.meta.url),
  );
  const videoSession = await request(
    'POST',
    `${source}/uploads`,
    { name: 'meeting.mp4', size: video.length },
    201,
  );
  const videoPart = await request(
    'POST',
    `${source}/uploads/${videoSession.id}/part`,
    { number: 1 },
    201,
  );
  assert.equal((await fetch(videoPart.url, { method: 'PUT', body: video })).status, 200);
  const inspected = await request('POST', `${source}/uploads/${videoSession.id}/complete`, {}, 201);
  assert.equal(inspected.preview, 'video');
  assert.equal(inspected.hasThumbnail, true);
  assert.equal(inspected.width, 320);
  assert.equal(inspected.height, 180);
  assert.equal(inspected.duration, 2);
  assert.ok(inspected.placeholder);
  const videoInput = {
    markdown: 'Video caption',
    clientNonce: randomUUID(),
    attachments: [{ id: inspected.id }],
  };
  await request(
    'POST',
    `${source}/messages`,
    {
      ...videoInput,
      attachments: [{ id: inspected.id, hasThumbnail: true, objectKey: 'another-object' }],
    },
    400,
  );
  const videoMessage = await request('POST', `${source}/messages`, videoInput, 201);
  assert.deepEqual(videoMessage.attachments, [inspected]);
  assert.equal((await request('POST', `${source}/messages`, videoInput, 201)).id, videoMessage.id);
  const storedVideo = await request('GET', `${source}/messages/${videoMessage.id}`);
  assert.equal(storedVideo.type, 'MESSAGE');
  assert.deepEqual(storedVideo.message.attachments, [inspected]);
  assert.equal(storedVideo.message.markdown, videoInput.markdown);
  for (const variant of ['thumbnail', 'preview', 'download'])
    await request(
      'GET',
      `${source}/uploads/${inspected.id}/messages/${videoMessage.id}/url?variant=${variant}`,
      undefined,
      404,
      outsider,
    );
  const videoPoster = await request(
    'GET',
    `${source}/uploads/${inspected.id}/messages/${videoMessage.id}/url?variant=thumbnail`,
  );
  await request(
    'GET',
    `${source}/uploads/${inspected.id}/messages/${videoMessage.id}/url?variant=preview`,
    undefined,
    200,
    viewer,
  );
  await pool.query('delete from channel_grants where channel_id = $1 and member_id = $2', [
    channelIds[0],
    members[2],
  ]);
  await pool.query('delete from channel_memberships where channel_id = $1 and member_id = $2', [
    channelIds[0],
    members[2],
  ]);
  await request(
    'GET',
    `${source}/uploads/${inspected.id}/messages/${videoMessage.id}/url?variant=preview`,
    undefined,
    404,
    viewer,
  );
  const posterResponse = await fetch(videoPoster.url);
  assert.equal(posterResponse.headers.get('content-type'), 'image/webp');
  assert.match(posterResponse.headers.get('content-disposition'), /^inline;/);
  const posterImage = await sharp(Buffer.from(await posterResponse.arrayBuffer())).metadata();
  assert.equal(posterImage.width, 320);
  const publicPoster = new URL(videoPoster.url);
  publicPoster.search = '';
  const deniedPoster = await fetch(publicPoster);
  assert.equal(deniedPoster.status, 403);
  await deniedPoster.body?.cancel();
  const previewLink = await request(
    'GET',
    `${source}/uploads/${inspected.id}/messages/${videoMessage.id}/url?variant=preview`,
  );
  const videoRange = await fetch(previewLink.url, { headers: { Range: 'bytes=0-127' } });
  assert.equal(videoRange.status, 206);
  assert.equal(videoRange.headers.get('content-type'), 'video/mp4');
  assert.match(videoRange.headers.get('content-disposition'), /^inline;/);
  assert.deepEqual(Buffer.from(await videoRange.arrayBuffer()), video.subarray(0, 128));
  const downloadLink = await request(
    'GET',
    `${source}/uploads/${inspected.id}/messages/${videoMessage.id}/url?variant=download`,
  );
  const downloadedVideo = await fetch(downloadLink.url);
  assert.match(downloadedVideo.headers.get('content-disposition'), /^attachment;/);
  assert.deepEqual(Buffer.from(await downloadedVideo.arrayBuffer()), video);
  const forwardedVideo = await request(
    'POST',
    `/workspaces/${workspaceId}/messages/forward`,
    {
      sourceChannelId: channelIds[0],
      target: { kind: 'channel', id: channelIds[1] },
      batchNonce: randomUUID(),
      messageIds: [videoMessage.id],
    },
    201,
  );
  assert.deepEqual(forwardedVideo.messages[0].attachments, [inspected]);
  await request('DELETE', `${source}/messages/${videoMessage.id}`, undefined, 204);
  await request(
    'GET',
    `${source}/uploads/${inspected.id}/messages/${videoMessage.id}/url?variant=thumbnail`,
    undefined,
    404,
  );
  await pool.query(
    "update chat_uploads set expires_at = now() - interval '1 minute' where id = $1",
    [inspected.id],
  );
  await app.get(UploadCleanupService).sweep();
  const forwardedPoster = await request(
    'GET',
    `${target}/uploads/${inspected.id}/messages/${forwardedVideo.messages[0].id}/url?variant=thumbnail`,
  );
  const retainedPoster = await fetch(forwardedPoster.url);
  assert.equal(retainedPoster.status, 200);
  await retainedPoster.body?.cancel();
  await request('DELETE', `${target}/messages/${forwardedVideo.messages[0].id}`, undefined, 204);
  await pool.query(
    "update chat_uploads set expires_at = now() - interval '1 minute' where id = $1",
    [inspected.id],
  );
  await app.get(UploadCleanupService).sweep();
  const removedPoster = await fetch(forwardedPoster.url);
  assert.equal(removedPoster.status, 404);
  await removedPoster.body?.cancel();
  const removedOriginal = await fetch(previewLink.url);
  assert.equal(removedOriginal.status, 404);
  await removedOriginal.body?.cancel();
  await pool.query('delete from channels where id = $1', [channelIds[1]]);
  await pool.query(
    "update chat_uploads set expires_at = now() - interval '1 minute' where workspace_id = $1",
    [workspaceId],
  );
  await app.get(UploadCleanupService).sweep();
  const leftovers = await pool.query('select id from chat_uploads where workspace_id = $1', [
    workspaceId,
  ]);
  assert.equal(leftovers.rowCount, 0);
  console.log(
    JSON.stringify({
      uploadedBytes: size,
      peakRssIncreaseBytes: peak - initialMemory,
      checks:
        'multipart, 1 GB limit, private access, idempotency, forwarding, image/video thumbnails, video byte ranges and downloads, completion leases/recovery, nonblocking preview, live-forward retention and original/poster cleanup',
    }),
  );
} finally {
  try {
    if (workspaceId) {
      await pool.query('delete from channels where workspace_id = $1', [workspaceId]);
      await pool.query('delete from workspaces where id = $1', [workspaceId]);
      await pool.query('delete from user_profiles where oidc_user_id in ($1, $2, $3)', [
        actor,
        outsider,
        viewer,
      ]);
    }
  } finally {
    await app.close();
    await pool.end();
    s3.destroy();
  }
}
