import type { Readable } from 'node:stream';

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';

import { DOWNLOAD_URL_SECONDS, type StoredPart, UPLOAD_URL_SECONDS } from '../attachments/types';
import { NoSuchUploadError, StorageProvider } from './storage.provider';

function isNoSuchUpload(error: unknown): boolean {
  return error instanceof Error && error.name === 'NoSuchUpload';
}

@Injectable()
export class DigitalOceanSpacesProvider extends StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpointHost: string;

  constructor(config: AppConfigService) {
    super();
    this.bucket = config.get('DIGITAL_OCEAN_SPACES_BUCKET');

    const { endpointUrl, region } = this.parseEndpoint(config.get('DIGITAL_OCEAN_SPACES_ENDPOINT'));
    this.endpointHost = new URL(endpointUrl).host;
    this.client = new S3Client({
      region,
      endpoint: endpointUrl,
      forcePathStyle: false,
      requestHandler: { requestTimeout: 30_000 },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: config.get('DIGITAL_OCEAN_SPACES_ACCESS_KEY'),
        secretAccessKey: config.get('DIGITAL_OCEAN_SPACES_SECRET_KEY'),
      },
    });
  }

  async uploadObject(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  buildFileUrl(key: string): string {
    return `https://${this.bucket}.${this.endpointHost}/${key.replace(/^\//, '')}`;
  }

  async beginMultipart(key: string): Promise<string> {
    const result = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ACL: 'private',
        ContentType: 'application/octet-stream',
      }),
    );
    if (!result.UploadId) throw new Error('Storage did not return an upload ID');
    return result.UploadId;
  }

  signPart(key: string, uploadId: string, number: number, size: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new UploadPartCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: number,
        ContentLength: size,
      }),
      { expiresIn: UPLOAD_URL_SECONDS, signableHeaders: new Set(['content-length']) },
    );
  }

  async listParts(key: string, uploadId: string): Promise<StoredPart[]> {
    const result = await this.client.send(
      new ListPartsCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MaxParts: 100,
      }),
    );
    if (result.IsTruncated) throw new Error('Unexpected multipart part count');
    return (result.Parts ?? []).map((part) => {
      if (!part.PartNumber || part.Size === undefined || !part.ETag)
        throw new Error('Invalid storage part');
      return { number: part.PartNumber, size: part.Size, etag: part.ETag };
    });
  }

  async completeMultipart(key: string, uploadId: string, parts: StoredPart[]): Promise<void> {
    try {
      await this.client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: parts.map((part) => ({ PartNumber: part.number, ETag: part.etag })),
          },
        }),
      );
    } catch (error) {
      if (isNoSuchUpload(error)) throw new NoSuchUploadError(uploadId);
      throw error;
    }
  }

  async abortMultipart(key: string, uploadId: string): Promise<void> {
    try {
      await this.client.send(
        new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId }),
      );
    } catch (error) {
      if (!isNoSuchUpload(error)) throw error;
    }
  }

  async objectSize(key: string): Promise<number> {
    const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    if (result.ContentLength === undefined) throw new Error('Storage object has no size');
    return result.ContentLength;
  }

  async readObject(key: string, range?: string): Promise<Readable> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(range ? { Range: range } : {}),
      }),
    );
    if (!result.Body) throw new Error('Storage object has no body');
    return result.Body as Readable;
  }

  async putPrivateObject(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'private',
      }),
    );
  }

  signDownload(key: string, name: string, contentType: string, inline: boolean): Promise<string> {
    const filename = encodeURIComponent(name).replace(
      /['()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16)}`,
    );
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: contentType,
        ResponseContentDisposition: `${inline ? 'inline' : 'attachment'}; filename="download"; filename*=UTF-8''${filename}`,
        ResponseCacheControl: 'private, max-age=0, no-store',
      }),
      { expiresIn: DOWNLOAD_URL_SECONDS },
    );
  }

  private parseEndpoint(endpoint: string): { endpointUrl: string; region: string } {
    const withProtocol = /^https?:\/\//.test(endpoint) ? endpoint : `https://${endpoint}`;
    const url = new URL(withProtocol);

    let host = url.host.replace(/\/+$/, '');
    if (host.startsWith(`${this.bucket}.`)) host = host.substring(this.bucket.length + 1);

    const region = host.split('.')[0] || 'us-east-1';
    return { endpointUrl: `${url.protocol}//${host}`, region };
  }
}
