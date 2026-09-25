export abstract class StorageProvider {
  abstract uploadObject(key: string, buffer: Buffer, contentType: string): Promise<void>;
  abstract deleteObject(key: string): Promise<void>;
  abstract buildFileUrl(key: string): string;
}
