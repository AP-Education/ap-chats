import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { and, inArray, isNotNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import {
  AttachmentPreviewService,
  identifyMedia,
} from '../../src/components/social/attachments/attachment-preview.service';
import { normalizeFilename } from '../../src/components/social/attachments/upload-policy';
import type { StorageProvider } from '../../src/components/uploads/storage';
import { chatUploads, type StoredAttachment } from '../../src/database/drizzle/schema';
import type { ChannelHistory, DumpedAttachment, DumpedPerson } from './dump-format';
import { importedId, inBatches } from './restore-ids';

// The preview service renders one image at a time and turns away a fifth caller in line.
const CONCURRENCY = 4;

export const attachmentObjectKey = (workspaceId: string, uploadId: string) =>
  `chat-attachments/${workspaceId}/${uploadId}`;
const avatarKey = (file: string) => `uploads/discord/${path.basename(file)}`;

async function eachWithin<T>(items: T[], work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await work(items[next++]!);
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
}

async function storedSize(storage: StorageProvider, key: string): Promise<number | null> {
  try {
    return await storage.objectSize(key);
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFound') return null;
    throw error;
  }
}

async function knownAttachments(
  db: NodePgDatabase,
  uploadIds: string[],
): Promise<Map<string, StoredAttachment>> {
  const known = new Map<string, StoredAttachment>();
  for (const batch of inBatches(uploadIds)) {
    const rows = await db
      .select({ id: chatUploads.id, metadata: chatUploads.metadata })
      .from(chatUploads)
      .where(and(inArray(chatUploads.id, batch), isNotNull(chatUploads.metadata)));
    for (const row of rows) known.set(row.id, row.metadata!);
  }
  return known;
}

function progress(label: string, done: number, total: number): void {
  if (done % 100 === 0 || done === total) console.error(`${label}: ${done}/${total}`);
}

/**
 * Puts each message file where the app keeps an upload and reads it the way the app does, preview
 * and ThumbHash included. A file restored before is taken as it is, so a rerun sends nothing.
 * Without storage, a dry run, files are described by name and size alone.
 */
export async function storeAttachments(
  db: NodePgDatabase,
  storage: StorageProvider | null,
  workspaceId: string,
  dumpDir: string,
  histories: ChannelHistory[],
): Promise<Map<string, StoredAttachment>> {
  const dumped = histories.flatMap((history) =>
    history.messages.flatMap((message) => message.attachments),
  );
  const uploadIdOf = (attachment: DumpedAttachment) => importedId(workspaceId, attachment.id);
  const known = await knownAttachments(db, dumped.map(uploadIdOf));
  const preview = storage && new AttachmentPreviewService(storage);

  const stored = new Map<string, StoredAttachment>();
  const pending = dumped.filter((attachment) => {
    const metadata = known.get(uploadIdOf(attachment));
    if (metadata) stored.set(attachment.id, metadata);
    return !metadata;
  });

  let done = 0;
  await eachWithin(pending, async (attachment) => {
    const id = uploadIdOf(attachment);
    const described = {
      id,
      name: normalizeFilename(attachment.name),
      size: attachment.size,
      description: null,
    };
    if (!storage || !preview) {
      stored.set(attachment.id, {
        ...described,
        mediaType: 'application/octet-stream',
        preview: null,
        width: null,
        height: null,
      });
      return;
    }

    const key = attachmentObjectKey(workspaceId, id);
    if ((await storedSize(storage, key)) !== attachment.size) {
      const body = await readFile(path.join(dumpDir, attachment.file));
      await storage.putPrivateObject(key, body, 'application/octet-stream');
    }
    stored.set(attachment.id, { ...described, ...(await preview.inspect(key, attachment.size)) });
    progress('files', ++done, pending.length);
  });

  return stored;
}

/**
 * Discord avatars for the placeholders, public like any avatar and named by content, so each one is
 * sent once. Gives each person's avatar URL by their Discord id; none on a dry run.
 */
export async function storeAvatars(
  storage: StorageProvider | null,
  dumpDir: string,
  people: DumpedPerson[],
): Promise<Map<string, string>> {
  if (!storage) return new Map();

  const files = new Map(
    people.flatMap(({ avatar }) => (avatar ? [[avatarKey(avatar), avatar]] : [])),
  );
  let done = 0;
  await eachWithin([...files], async ([key, file]) => {
    if ((await storedSize(storage, key)) === null) {
      const body = await readFile(path.join(dumpDir, file));
      const { mediaType } = await identifyMedia(body);
      await storage.uploadObject(key, body, mediaType);
    }
    progress('avatars', ++done, files.size);
  });

  return new Map(
    people.flatMap(({ id, avatar }) =>
      avatar ? [[id, storage.buildFileUrl(avatarKey(avatar))]] : [],
    ),
  );
}
