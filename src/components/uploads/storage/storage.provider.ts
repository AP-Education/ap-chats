import type { Readable } from 'node:stream';

import type { StoredPart } from '../attachments/types';

/** The multipart session completeMultipart() was asked to finish no longer exists (already completed or aborted). */
export class NoSuchUploadError extends Error {}

export abstract class StorageProvider {
  abstract uploadObject(key: string, buffer: Buffer, contentType: string): Promise<void>;
  abstract deleteObject(key: string): Promise<void>;
  abstract buildFileUrl(key: string): string;
  abstract beginMultipart(key: string): Promise<string>;
  abstract signPart(key: string, uploadId: string, number: number, size: number): Promise<string>;
  abstract listParts(key: string, uploadId: string): Promise<StoredPart[]>;
  abstract completeMultipart(key: string, uploadId: string, parts: StoredPart[]): Promise<void>;
  abstract abortMultipart(key: string, uploadId: string): Promise<void>;
  abstract objectSize(key: string): Promise<number>;
  abstract readObject(key: string, range?: string): Promise<Readable>;
  abstract putPrivateObject(key: string, buffer: Buffer, contentType: string): Promise<void>;
  abstract signDownload(
    key: string,
    name: string,
    contentType: string,
    inline: boolean,
  ): Promise<string>;
}
