import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ViteDevServer } from 'vite';

import type { Attachment } from '../../src/features/social/messaging/attachments/types.ts';
import type { Message, MessageHistoryItem } from '../../src/features/social/messaging/types.ts';

interface Upload {
  id: string;
  name: string;
  size: number;
  attachment?: Attachment;
}
interface Input {
  markdown: string;
  clientNonce: string;
  attachments?: { id: string; description?: string }[];
}

async function jsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk as Uint8Array));
  return JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>;
}

/** Deterministic local API; production upload queues, outboxes and chat components run unchanged. */
export function fixtureApi(server: Pick<ViteDevServer, 'middlewares'>) {
  const uploads = new Map<string, Upload>();
  const messages = new Map<string, MessageHistoryItem>();
  let sequence = 3;

  async function handle(req: IncomingMessage, res: ServerResponse, next: () => void) {
    const path = new URL(req.url ?? '/', 'http://localhost');
    if (path.pathname.startsWith('/fixture-storage/')) {
      for await (const chunk of req) void chunk;
      res.statusCode = 200;
      res.end();
      return;
    }
    if (!path.pathname.startsWith('/api/')) return next();
    res.setHeader('Content-Type', 'application/json');
    const respond = (value: unknown, status = 200) => {
      res.statusCode = status;
      res.end(JSON.stringify(value));
    };
    if (path.pathname.endsWith('/policy'))
      return respond({
        maxFileBytes: 1_000_000_000,
        maxMessageBytes: 1_000_000_000,
        maxFiles: 10,
        partBytes: 8 * 1024 * 1024,
      });
    if (path.pathname.endsWith('/uploads') && req.method === 'POST') {
      const input = await jsonBody(req);
      const id = randomUUID();
      uploads.set(id, { id, name: String(input.name), size: Number(input.size) });
      return respond(
        {
          id,
          partBytes: 8 * 1024 * 1024,
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
        201,
      );
    }
    const uploadId = path.pathname.split('/uploads/')[1]?.split('/')[0];
    if (path.pathname.endsWith('/part')) {
      const input = await jsonBody(req);
      return respond({ url: `/fixture-storage/${uploadId}/${String(input.number)}` }, 201);
    }
    if (path.pathname.endsWith('/complete')) {
      const upload = uploads.get(uploadId!);
      if (!upload) return respond({ message: 'Upload not found' }, 404);
      const attachment: Attachment = {
        id: upload.id,
        name: upload.name,
        size: upload.size,
        preview: 'video',
        mediaType: 'video/mp4',
        width: 320,
        height: 180,
        duration: 2,
        hasThumbnail: true,
        description: null,
      };
      upload.attachment = attachment;
      return respond(attachment, 201);
    }
    if (uploadId && req.method === 'DELETE') {
      uploads.delete(uploadId);
      res.statusCode = 204;
      res.end();
      return;
    }
    if (path.pathname.endsWith('/url')) {
      const params = new URL(req.headers.referer ?? 'http://localhost').searchParams;
      const thumbnail = path.searchParams.get('variant') === 'thumbnail';
      const name = params.has('portrait')
        ? 'portrait'
        : params.has('long') && !thumbnail
          ? 'long'
          : 'sample';
      return respond({ url: `/media/${name}.${thumbnail ? 'webp' : 'mp4'}` });
    }
    if (path.pathname.endsWith('/messages') && req.method === 'POST') {
      const input = (await jsonBody(req)) as unknown as Input;
      const existing = [...messages.values()].find(
        (item) => item.message.clientNonce === input.clientNonce,
      );
      if (existing) return respond(existing.message, 201);
      const message: Message = {
        id: randomUUID(),
        seq: String(++sequence),
        authorMemberId: 'member',
        clientNonce: input.clientNonce,
        markdown: input.markdown,
        attachments: (input.attachments ?? []).map(({ id }) => uploads.get(id)!.attachment!),
        blocks: [],
        contentVersion: 1,
        revision: 1,
        replyToMessageId: null,
        quoteText: null,
        isForwarded: false,
        forwardedFromMemberId: null,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
      };
      messages.set(message.id, {
        type: 'MESSAGE',
        id: message.id,
        seq: message.seq,
        createdAt: message.createdAt,
        message,
        author: {
          memberId: 'member',
          displayName: 'Ви',
          avatarPath: null,
          roleColor: null,
          isBot: false,
        },
        reply: null,
        context: null,
        forwardedFrom: null,
        pin: null,
      });
      return respond(message, 201);
    }
    const messageId = path.pathname.split('/messages/')[1];
    if (messageId && req.method === 'GET') return respond(messages.get(messageId) ?? null);
    return respond([]);
  }

  server.middlewares.use((req, res, next) => {
    void handle(req, res, next).catch((error: unknown) => {
      res.statusCode = 500;
      res.end(JSON.stringify({ message: String(error) }));
    });
  });
}
