import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';

import { StorageProvider } from './storage.provider';

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

  private parseEndpoint(endpoint: string): { endpointUrl: string; region: string } {
    const withProtocol = /^https?:\/\//.test(endpoint) ? endpoint : `https://${endpoint}`;
    const url = new URL(withProtocol);

    let host = url.host.replace(/\/+$/, '');
    if (host.startsWith(`${this.bucket}.`)) host = host.substring(this.bucket.length + 1);

    const region = host.split('.')[0] || 'us-east-1';
    return { endpointUrl: `${url.protocol}//${host}`, region };
  }
}
