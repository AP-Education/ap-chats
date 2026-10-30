import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

import { inspectVoice } from '../../../src/components/social/attachments/voice-inspection';

// Disposable synthetic-data API for local native QA; no production configuration is loaded.
const files = new Map<string, { name: string; size: number; bytes: Buffer; metadata?: object }>();
const qaResults: unknown[] = [];
const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'authorization,content-type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }
  const url = new URL(request.url!, `http://${request.headers.host}`);
  const json = (value: unknown, status = 200) => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(value));
  };
  try {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > 20 * 1024 * 1024) {
        json({ message: 'Too large' }, 413);
        return;
      }
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);
    if (url.pathname.includes('/test-part/')) {
      const file = files.get(url.pathname.split('/').at(-1)!);
      if (!file || body.length !== file.size) {
        json({}, 400);
        return;
      }
      file.bytes = body;
      json({});
      return;
    }
    if (url.pathname.includes('/test-audio/')) {
      const file = files.get(url.pathname.split('/').at(-1)!);
      if (!file) {
        json({}, 404);
        return;
      }
      response.writeHead(200, { 'content-type': 'audio/mp4', 'content-length': file.bytes.length });
      response.end(file.bytes);
      return;
    }
    if (request.headers.authorization !== 'Bearer fixture-only') {
      json({}, 401);
      return;
    }
    if (url.pathname === '/api/qa-result') {
      const result = JSON.parse(body.toString());
      qaResults.push(result);
      console.log('NATIVE_QA', JSON.stringify(result));
      json({ ok: true });
      return;
    }
    if (url.pathname === '/api/qa-results') {
      json(qaResults);
      return;
    }
    if (url.pathname.endsWith('/uploads/policy')) {
      json({
        maxFiles: 10,
        maxFileBytes: 20 * 1024 * 1024,
        maxMessageBytes: 20 * 1024 * 1024,
        partBytes: 16 * 1024 * 1024,
      });
      return;
    }
    if (url.pathname.endsWith('/uploads')) {
      const value = JSON.parse(body.toString());
      const id = randomUUID();
      if (!Number.isInteger(value.size) || value.size < 1 || value.size > 20 * 1024 * 1024) {
        json({}, 400);
        return;
      }
      files.set(id, { name: value.name, size: value.size, bytes: Buffer.alloc(0) });
      json(
        {
          id,
          partBytes: 16 * 1024 * 1024,
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        },
        201,
      );
      return;
    }
    if (url.pathname.endsWith('/part')) {
      const id = url.pathname.split('/').at(-2)!;
      json({ url: `${url.origin}/api/test-part/${id}` });
      return;
    }
    if (url.pathname.endsWith('/complete')) {
      const id = url.pathname.split('/').at(-2)!;
      const file = files.get(id)!;
      const media = await inspectVoice(file.bytes);
      file.metadata = { id, name: file.name, size: file.size, description: null, ...media };
      json(file.metadata);
      return;
    }
    if (url.pathname.endsWith('/messages') && request.method === 'POST') {
      const value = JSON.parse(body.toString());
      json(
        {
          ...value,
          id: randomUUID(),
          seq: '1',
          createdAt: new Date().toISOString(),
          markdown: value.markdown,
          attachments: value.attachments.map(
            (file: { id: string }) => files.get(file.id)?.metadata,
          ),
          contentVersion: 1,
          revision: 1,
          authorMemberId: 'fixture',
        },
        201,
      );
      return;
    }
    if (url.pathname.endsWith('/url')) {
      const id = url.pathname.split('/uploads/')[1]!.split('/')[0]!;
      json({ url: `${url.origin}/api/test-audio/${id}` });
      return;
    }
    if (request.method === 'DELETE') {
      json({});
      return;
    }
    json([]);
  } catch (error) {
    json({ message: error instanceof Error ? error.message : 'Test API error' }, 400);
  }
});
server.listen(5572, '127.0.0.1', () => console.log('Synthetic voice QA API listening on 5572'));
