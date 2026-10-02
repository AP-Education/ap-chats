import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { Logger } from '@/globals/logger';

import { StorageProvider } from '../storage/storage.provider';
import { ChatUploadsRepository } from './uploads.repository';

@Injectable()
export class UploadCleanupService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    private readonly repository: ChatUploadsRepository,
    private readonly storage: StorageProvider,
    private readonly logger: Logger,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.sweep(), 60_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  async sweep(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (const row of await this.repository.expired()) {
        try {
          await this.purge(row.id);
        } catch (error) {
          this.logger.error({ error, uploadId: row.id }, 'Attachment cleanup failed');
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Attachment cleanup failed');
    } finally {
      this.running = false;
    }
  }

  @Transactional()
  private async purge(id: string): Promise<void> {
    const row = await this.repository.lock(id);
    if (!row || row.expiresAt.getTime() > Date.now()) return;
    if (row.state === 'attached') {
      if (await this.repository.hasLiveReferences(id)) {
        await this.repository.update(id, { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
        return;
      }
    }
    await this.storage.abortMultipart(row.objectKey, row.multipartId);
    await this.storage.deleteObject(row.objectKey);
    await this.storage.deleteObject(`${row.objectKey}.preview.webp`);
    await this.repository.remove(id);
  }
}
