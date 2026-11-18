import { readFile } from 'node:fs/promises';

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import type { UpdateFile } from './manifest';

export interface ObjectStore {
  exists(key: string): Promise<boolean>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
}

/** A Spaces bucket the phones read update files from, at `https://<bucket>.<endpoint host>/`. */
export function spacesStore(options: {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}): ObjectStore {
  const endpoint = new URL(
    /^https?:\/\//u.test(options.endpoint) ? options.endpoint : `https://${options.endpoint}`,
  );
  const client = new S3Client({
    region: endpoint.hostname.split('.')[0] ?? 'us-east-1',
    endpoint: endpoint.origin,
    forcePathStyle: false,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: { accessKeyId: options.accessKey, secretAccessKey: options.secretKey },
    // A stalled connection fails and is retried instead of holding the shared updates queue.
    // socketTimeout counts idle time, so a large bundle still uploads; requestTimeout would
    // only log a warning in this SDK version.
    requestHandler: { connectionTimeout: 10_000, socketTimeout: 120_000 },
  });

  return {
    async exists(key) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: options.bucket, Key: key }));
        return true;
      } catch (error) {
        if (
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
        )
          return false;
        throw error;
      }
    },
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Named by content, so a file never changes and phones may keep it for good.
          CacheControl: 'public, max-age=31536000, immutable',
          ACL: 'public-read',
        }),
      );
    },
  };
}

/** Puts the files the bucket lacks; says how many it sent. */
export async function uploadMissing(store: ObjectStore, files: readonly UpdateFile[]) {
  const unique = [...new Map(files.map((file) => [file.objectKey, file])).values()];
  let sent = 0;
  for (const file of unique) {
    if (await store.exists(file.objectKey)) continue;
    await store.put(file.objectKey, await readFile(file.localPath), file.contentType);
    sent += 1;
  }
  return { sent, kept: unique.length - sent };
}
